import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARStep, RepairGuide } from '../data/mockData';
import { buildCompositeModel, detectARSupport, disposeThreeObject } from '../lib/ar';
import { useVoiceControl } from '../hooks/useVoiceControl';
import {
  compute3DDistanceMm,
  formatRulerLength,
  getModelMetersPerUnit,
  Point3D,
  projectScreenPointToDepthPlane,
} from '../utils/engine';
import {
  Camera,
  RotateCw,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Layers,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Monitor,
  Headphones,
  ExternalLink,
  ShieldCheck,
  Ruler,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface RulerPoint {
  normX: number;
  normY: number;
  world3D: Point3D;
  depthMeters: number;
  depthSource: '3d-raycast' | 'camera-plane' | 'webxr-depth';
}

interface RulerMeasurement {
  id: string;
  p1: RulerPoint;
  p2: RulerPoint;
  distanceMm: number;
  dxMm: number;
  dyMm: number;
  dzMm: number;
  avgDepthMeters: number;
  depthSource: '3d-raycast' | 'camera-plane' | 'webxr-depth';
}

interface ARViewerProps {
  guide: RepairGuide;
  currentStepIndex: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onStepComplete: (stepNumber: number) => void;
  completedSteps: Record<number, boolean>;
  onAskExpert: () => void;
  onChangeDevice: () => void;
}

export const ARViewer: React.FC<ARViewerProps> = ({
  guide,
  currentStepIndex,
  onNextStep,
  onPrevStep,
  onStepComplete,
  completedSteps,
  onAskExpert,
  onChangeDevice,
}) => {
  const step: ARStep = guide.steps[currentStepIndex] || guide.steps[0];
  const totalSteps = guide.steps.length;
  const isStepDone = !!completedSteps[step.stepNumber];

  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isExploded, setIsExploded] = useState(false);
  const [is2DFallback, setIs2DFallback] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);

  // AR-линейка (измерение габаритов деталей и расстояний между отверстиями по глубине сцены)
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerUnit, setRulerUnit] = useState<'mm' | 'cm'>('mm');
  const [cameraDepthMeters, setCameraDepthMeters] = useState(0.65);
  const [hide3DInCameraRuler, setHide3DInCameraRuler] = useState(false);
  const [depthSensingSupported, setDepthSensingSupported] = useState(false);
  const [rulerDraftPoint, setRulerDraftPoint] = useState<RulerPoint | null>(null);
  const [hoverNormPos, setHoverNormPos] = useState<{ normX: number; normY: number } | null>(null);
  const [measurements, setMeasurements] = useState<RulerMeasurement[]>([]);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const rulerGroupRef = useRef<THREE.Group | null>(null);
  const partsRef = useRef<Record<string, THREE.Object3D>>({});
  const pinRef = useRef<THREE.Group | null>(null);
  const arrowRef = useRef<THREE.Group | null>(null);
  const arrowDirectionRef = useRef(step.arrowDirection);
  const highlightRef = useRef(step.highlightCoordinates);
  const stepRef = useRef(step);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const applyStepToScene = (targetStep: ARStep) => {
    const coords = targetStep.highlightCoordinates;
    if (pinRef.current) {
      pinRef.current.position.set(coords.x, coords.y + 0.34, coords.z);
    }
    if (arrowRef.current) {
      if (targetStep.arrowDirection) {
        arrowRef.current.visible = true;
        arrowRef.current.position.set(coords.x, coords.y, coords.z + 0.32);
        if (targetStep.arrowDirection === 'pull-forward' || targetStep.arrowDirection === 'push') {
          arrowRef.current.rotation.set(Math.PI / 2, 0, 0);
        } else {
          arrowRef.current.rotation.set(0, 0, 0);
        }
      } else {
        arrowRef.current.visible = false;
      }
    }
    if (cameraRef.current) {
      const angle = targetStep.cameraAngle || { x: 1.5, y: 0.9, z: 2.3 };
      cameraRef.current.position.set(angle.x * 1.45, angle.y * 1.45, angle.z * 1.45);
      cameraRef.current.lookAt(coords.x * 0.15, coords.y * 0.15, coords.z * 0.15);
    }
  };

  useEffect(() => {
    stepRef.current = step;
    arrowDirectionRef.current = step.arrowDirection;
    highlightRef.current = step.highlightCoordinates;
  }, [step]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechAvailable(true);
    }
  }, []);

  const speakCurrentStep = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(step.voiceText || step.description);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const voiceControl = useVoiceControl({
    onNextStep,
    onPrevStep,
    onRepeatStep: speakCurrentStep,
    onStopSpeaking: () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    },
  });

  const toggleCamera = async () => {
    if (isCameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
      setCameraError(null);
    } else {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsCameraActive(true);
        }
      } catch {
        setCameraError('Камера недоступна — используется интерактивная 3D-сцена.');
        setIsCameraActive(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Инициализация Three.js сцены (с учётом isSoftwareGl и webglcontextlost)
  useEffect(() => {
    if (is2DFallback) return;
    const container = mountRef.current;
    if (!container) return;

    let cancelled = false;
    let animId = 0;
    let cleanupDom: (() => void) | null = null;

    (async () => {
      const support = await detectARSupport();
      if (cancelled || !container) return;
      setDepthSensingSupported(support.depthSensingSupported);

      if (!support.webglAvailable) {
        setIs2DFallback(true);
        return;
      }

      const width = container.clientWidth || 640;
      const height = container.clientHeight || 440;

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(2.1, 1.4, 3.0);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        antialias: !support.isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.setSize(width, height);
      renderer.setPixelRatio(support.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = !support.isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFShadowMap;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const onContextLost = (e: Event) => {
        e.preventDefault();
        setWebglLost(true);
      };
      const onContextRestored = () => {
        setWebglLost(false);
      };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

      // Three-Point Studio Lighting (hemisphere + key warm, fill cool, rim)
      scene.add(new THREE.AmbientLight(0xe2e8f0, 1.0));
      scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.65));

      const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
      keyLight.position.set(4, 7, 5);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.95);
      fillLight.position.set(-5, 2, 3);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
      rimLight.position.set(0, 4, -5);
      scene.add(rimLight);

      const grid = new THREE.GridHelper(3.4, 12, 0x1e293b, 0x0f172a);
      grid.position.y = -1.05;
      scene.add(grid);
      gridRef.current = grid;

      const { group, parts } = buildCompositeModel(guide.modelType);
      scene.add(group);
      modelGroupRef.current = group;
      partsRef.current = parts;

      const rulerGroup = new THREE.Group();
      group.add(rulerGroup);
      rulerGroupRef.current = rulerGroup;

      // 3D Маркер-аннотация
      const pinGroup = new THREE.Group();
      const pinMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.75,
        roughness: 0.25,
      });
      const pinSphere = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), pinMat);
      pinGroup.add(pinSphere);

      const pinStem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 8), pinMat);
      pinStem.position.set(0, -0.14, 0);
      pinGroup.add(pinStem);

      const haloRing = new THREE.Mesh(
        new THREE.RingGeometry(0.13, 0.18, 32),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        })
      );
      haloRing.rotation.x = Math.PI / 2;
      pinGroup.add(haloRing);

      scene.add(pinGroup);
      pinRef.current = pinGroup;

      // Анимированная стрелка действия
      const arrowGroup = new THREE.Group();
      const arrowMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.65,
        roughness: 0.3,
      });
      const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 12), arrowMat);
      arrowGroup.add(arrowShaft);
      const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.15, 16), arrowMat);
      arrowHead.position.set(0, 0.22, 0);
      arrowGroup.add(arrowHead);
      scene.add(arrowGroup);
      arrowRef.current = arrowGroup;

      // Применяем ракурс и координаты текущего шага сразу после создания сцены
      applyStepToScene(stepRef.current);

      // Orbit Controls (мышь и тач)
      let isDragging = false;
      let prevX = 0;
      let prevY = 0;

      const onPointerDown = (e: MouseEvent | TouchEvent) => {
        isDragging = true;
        prevX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        prevY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      };
      const onPointerMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !modelGroupRef.current) return;
        const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
        modelGroupRef.current.rotation.y += (cx - prevX) * 0.008;
        modelGroupRef.current.rotation.x = Math.max(
          -1.1,
          Math.min(1.1, modelGroupRef.current.rotation.x + (cy - prevY) * 0.008)
        );
        prevX = cx;
        prevY = cy;
      };
      const onPointerUp = () => {
        isDragging = false;
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        camera.position.z = Math.max(1.8, Math.min(5.2, camera.position.z + e.deltaY * 0.003));
      };

      const dom = renderer.domElement;
      dom.addEventListener('mousedown', onPointerDown);
      dom.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      dom.addEventListener('touchstart', onPointerDown, { passive: true });
      dom.addEventListener('touchmove', onPointerMove, { passive: true });
      window.addEventListener('touchend', onPointerUp);
      dom.addEventListener('wheel', onWheel, { passive: false });

      const startTime = performance.now();
      const animate = () => {
        animId = requestAnimationFrame(animate);
        const elapsed = (performance.now() - startTime) / 1000;

        if (pinRef.current) {
          pinRef.current.position.y =
            highlightRef.current.y + 0.34 + Math.sin(elapsed * 3.5) * 0.03;
          haloRing.scale.setScalar(1 + Math.sin(elapsed * 4.5) * 0.14);
        }

        if (arrowRef.current && arrowRef.current.visible) {
          const dir = arrowDirectionRef.current;
          if (dir === 'rotate-ccw') {
            arrowRef.current.rotation.z += 0.04;
          } else if (dir === 'rotate-cw') {
            arrowRef.current.rotation.z -= 0.04;
          } else if (dir === 'pull-forward') {
            arrowRef.current.position.z =
              highlightRef.current.z + 0.32 + Math.sin(elapsed * 4.5) * 0.07;
          }
        }

        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        if (!container || !rendererRef.current || !cameraRef.current) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      };
      window.addEventListener('resize', handleResize);

      cleanupDom = () => {
        window.removeEventListener('resize', handleResize);
        dom.removeEventListener('webglcontextlost', onContextLost);
        dom.removeEventListener('webglcontextrestored', onContextRestored);
        dom.removeEventListener('mousedown', onPointerDown);
        dom.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        dom.removeEventListener('touchstart', onPointerDown);
        dom.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);
        dom.removeEventListener('wheel', onWheel);
        disposeThreeObject(scene);
        renderer.dispose();
      };
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      cleanupDom?.();
    };
  }, [guide.modelType, is2DFallback]);

  // Обновление позиции маркера, стрелки и ракурса при смене шага
  useEffect(() => {
    applyStepToScene(step);
  }, [step]);

  // Скрытие 3D-макета при измерении реальных деталей через живую камеру
  useEffect(() => {
    const hide3D = isCameraActive && isRulerActive && hide3DInCameraRuler;
    if (modelGroupRef.current) modelGroupRef.current.visible = !hide3D;
    if (pinRef.current) pinRef.current.visible = !hide3D;
    if (arrowRef.current) arrowRef.current.visible = !hide3D && Boolean(step.arrowDirection);
    if (gridRef.current) gridRef.current.visible = !hide3D;
  }, [isCameraActive, isRulerActive, hide3DInCameraRuler, step.arrowDirection]);

  // Синхронизация 3D-маркеров и лазерной линии AR-линейки в сцене Three.js
  useEffect(() => {
    const rulerGroup = rulerGroupRef.current;
    const modelGroup = modelGroupRef.current;
    if (!rulerGroup || !modelGroup) return;

    while (rulerGroup.children.length > 0) {
      const child = rulerGroup.children[0];
      rulerGroup.remove(child);
      disposeThreeObject(child);
    }

    if (!isRulerActive) return;

    const addPinMesh = (worldPt: Point3D, colorHex: number) => {
      const localPt = modelGroup.worldToLocal(new THREE.Vector3(worldPt.x, worldPt.y, worldPt.z));
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 16, 16),
        new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.7,
          roughness: 0.2,
        })
      );
      sphere.position.copy(localPt);
      rulerGroup.add(sphere);
      return localPt;
    };

    if (rulerDraftPoint && rulerDraftPoint.depthSource === '3d-raycast') {
      addPinMesh(rulerDraftPoint.world3D, 0xf59e0b);
    }

    measurements.forEach((m) => {
      if (m.p1.depthSource === '3d-raycast' && m.p2.depthSource === '3d-raycast') {
        const l1 = addPinMesh(m.p1.world3D, 0x06b6d4);
        const l2 = addPinMesh(m.p2.world3D, 0x10b981);
        const lineGeo = new THREE.BufferGeometry().setFromPoints([l1, l2]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x22d3ee });
        rulerGroup.add(new THREE.Line(lineGeo, lineMat));
      }
    });
  }, [isRulerActive, rulerDraftPoint, measurements]);

  // Замер точки по глубине 3D-сцены (Raycaster) или плоскости глубины камеры
  const sampleRulerPoint = (clientX: number, clientY: number): RulerPoint | null => {
    const viewport = viewportRef.current;
    if (!viewport) return null;
    const rect = viewport.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const metersPerUnit = getModelMetersPerUnit(guide.modelType);
    const hide3D = isCameraActive && hide3DInCameraRuler;

    if (!is2DFallback && !webglLost && !hide3D && cameraRef.current && modelGroupRef.current) {
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2(normX * 2 - 1, -(normY * 2 - 1));
      raycaster.setFromCamera(ndc, cameraRef.current);
      // Исключаем собственные маркеры линейки из пересечений
      const targetMeshes = modelGroupRef.current.children.filter(
        (child) => child !== rulerGroupRef.current
      );
      const hits = raycaster.intersectObjects(targetMeshes, true);
      if (hits.length > 0) {
        const hit = hits[0];
        return {
          normX,
          normY,
          world3D: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
          depthMeters: Math.max(0.15, Math.round(hit.distance * metersPerUnit * 100) / 100),
          depthSource: '3d-raycast',
        };
      }
    }

    const fov = cameraRef.current?.fov || 45;
    const aspect = rect.width / rect.height;
    const projected = projectScreenPointToDepthPlane(
      normX,
      normY,
      cameraDepthMeters,
      fov,
      aspect
    );

    return {
      normX,
      normY,
      world3D: projected,
      depthMeters: cameraDepthMeters,
      depthSource: depthSensingSupported && isCameraActive ? 'webxr-depth' : 'camera-plane',
    };
  };

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRulerActive) return;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRulerActive || !rulerDraftPoint || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    setHoverNormPos({
      normX: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      normY: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    });
  };

  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRulerActive || !pointerDownPosRef.current) return;
    const moved = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );
    pointerDownPosRef.current = null;
    // Игнорируем перетаскивание орбиты 3D-модели
    if (moved > 6) return;

    const sampled = sampleRulerPoint(e.clientX, e.clientY);
    if (!sampled) return;

    if (!rulerDraftPoint) {
      setRulerDraftPoint(sampled);
      setHoverNormPos({ normX: sampled.normX, normY: sampled.normY });
      return;
    }

    const viewport = viewportRef.current;
    const fov = cameraRef.current?.fov || 45;
    const aspect =
      viewport && viewport.clientHeight > 0
        ? viewport.clientWidth / viewport.clientHeight
        : 1.5;

    let metrics;
    let combinedSource: RulerMeasurement['depthSource'] = sampled.depthSource;

    if (
      rulerDraftPoint.depthSource === '3d-raycast' &&
      sampled.depthSource === '3d-raycast'
    ) {
      metrics = compute3DDistanceMm(
        rulerDraftPoint.world3D,
        sampled.world3D,
        getModelMetersPerUnit(guide.modelType)
      );
      combinedSource = '3d-raycast';
    } else {
      const p1Meters = projectScreenPointToDepthPlane(
        rulerDraftPoint.normX,
        rulerDraftPoint.normY,
        rulerDraftPoint.depthMeters,
        fov,
        aspect
      );
      const p2Meters = projectScreenPointToDepthPlane(
        sampled.normX,
        sampled.normY,
        sampled.depthMeters,
        fov,
        aspect
      );
      metrics = compute3DDistanceMm(p1Meters, p2Meters, 1);
      if (rulerDraftPoint.depthSource === 'camera-plane' || sampled.depthSource === 'camera-plane') {
        combinedSource = 'camera-plane';
      }
    }

    const newMeasurement: RulerMeasurement = {
      id: `msr-${Date.now()}`,
      p1: rulerDraftPoint,
      p2: sampled,
      distanceMm: metrics.distanceMm,
      dxMm: metrics.dxMm,
      dyMm: metrics.dyMm,
      dzMm: metrics.dzMm,
      avgDepthMeters:
        Math.round(((rulerDraftPoint.depthMeters + sampled.depthMeters) / 2) * 100) / 100,
      depthSource: combinedSource,
    };

    setMeasurements((prev) => [newMeasurement, ...prev].slice(0, 8));
    setRulerDraftPoint(null);
    setHoverNormPos(null);
  };

  // Взрыв-схема (Exploded View)
  useEffect(() => {
    const parts = partsRef.current;
    if (parts['filter_assembly']) {
      parts['filter_assembly'].position.z =
        0.74 + (isExploded ? 0.45 : step.targetPartId === 'filter_assembly' ? 0.16 : 0);
    }
    if (parts['service_door']) {
      parts['service_door'].rotation.x = isExploded || currentStepIndex >= 1 ? -Math.PI / 2 : 0;
    }
    if (parts['drawer']) {
      parts['drawer'].position.z = 0.62 + (isExploded ? 0.38 : 0);
    }
    if (parts['mw_casing']) {
      parts['mw_casing'].position.y = isExploded ? 0.48 : 0;
    }
    if (parts['vac_filter']) {
      parts['vac_filter'].position.y = 0.55 + (isExploded ? 0.35 : 0);
    }
  }, [isExploded, currentStepIndex, step]);

  return (
    <div className="space-y-6">
      {/* Guide Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-cyan-400">{guide.difficulty}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{guide.estimatedTime}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-semibold font-mono tabular-nums">
              Экономия {guide.moneySaved.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {guide.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Симптом: <span className="text-slate-300">{guide.symptom}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onAskExpert}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-semibold text-xs flex items-center gap-2 border border-rose-500/30 transition-colors whitespace-nowrap shrink-0"
          >
            <Headphones className="w-4 h-4" />
            <span>Позвать мастера</span>
          </button>

          <button
            type="button"
            onClick={onChangeDevice}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            К каталогу
          </button>
        </div>
      </div>

      {/* Interactive AR / 3D / 2D Fallback Viewport */}
      <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col">
        {/* Viewer Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 font-bold font-mono tabular-nums flex items-center justify-center border border-cyan-500/30 shrink-0">
              {step.stepNumber}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-400 font-mono tabular-nums">
                Шаг {step.stepNumber} из {totalSteps}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {step.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {speechAvailable && (
              <button
                type="button"
                onClick={speakCurrentStep}
                className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  isSpeaking
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
                aria-label="Озвучить шаг голосом"
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isSpeaking ? 'Стоп' : 'Голос'}</span>
              </button>
            )}

            {voiceControl.isSupported && (
              <button
                type="button"
                onClick={voiceControl.toggleListening}
                className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  voiceControl.isListening
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
                aria-label="Управление голосом (следующий шаг, повтори, стоп)"
              >
                {voiceControl.isListening ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {voiceControl.isListening ? 'Слушаю' : 'Команды'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsRulerActive((prev) => !prev);
                setRulerDraftPoint(null);
                setHoverNormPos(null);
              }}
              data-testid="ar-ruler-toggle"
              className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                isRulerActive
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              aria-label="Включить AR-линейку для замера габаритов"
            >
              <Ruler className="w-4 h-4" />
              <span>AR-линейка</span>
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                isCameraActive
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              aria-label="Включить AR камеру"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isCameraActive ? 'AR Камера вкл' : 'AR Камера'}
              </span>
            </button>

            {!is2DFallback && (
              <button
                type="button"
                onClick={() => setIsExploded(!isExploded)}
                className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  isExploded
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
                aria-label="Взрыв-схема деталей"
              >
                <Layers className="w-4 h-4" />
                <span className="hidden md:inline">Взрыв-схема</span>
              </button>
            )}

            {/* 2D Fallback Mode Switch (ТЗ Risk 1 Mitigation) */}
            <button
              type="button"
              onClick={() => setIs2DFallback(!is2DFallback)}
              className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                is2DFallback
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              aria-label="Переключить 2D-режим"
            >
              <Monitor className="w-4 h-4" />
              <span>{is2DFallback ? '3D Режим' : '2D Схема'}</span>
            </button>
          </div>
        </div>

        {/* Canvas or 2D Diagram Viewport */}
        <div
          ref={viewportRef}
          data-testid="ar-viewport"
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerUp}
          onPointerLeave={() => setHoverNormPos(null)}
          className={`relative w-full h-[320px] sm:h-[420px] md:h-[460px] bg-slate-950 flex items-center justify-center overflow-hidden select-none ${
            isRulerActive ? 'cursor-crosshair' : ''
          }`}
        >
          {is2DFallback || webglLost ? (
            /* 2D Инструкция (Fallback при отсутствии AR/WebGL) */
            <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center gap-4 bg-slate-950">
              <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-left">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>2D Режим схемы</span>
                  <span className="font-mono text-cyan-400">Узел: {step.targetPartId}</span>
                </div>
                <svg viewBox="0 0 300 180" className="w-full h-36 rounded-xl bg-slate-950 border border-slate-800">
                  <rect x="65" y="15" width="170" height="150" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                  <circle cx="150" cy="82" r="38" fill="#0f172a" stroke="#94a3b8" strokeWidth="4" />
                  <rect x="192" y="132" width="32" height="22" rx="3" fill="#0ea5e9" fillOpacity="0.35" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="208" cy="143" r="6" fill="#06b6d4" />
                </svg>
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white">Чек-лист: </span>
                  {step.checklistItem}
                </div>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300 ${
                  isCameraActive ? 'opacity-90' : 'opacity-0 pointer-events-none'
                }`}
              />
              <div
                ref={mountRef}
                className="absolute inset-0 w-full h-full z-1 cursor-grab active:cursor-grabbing"
                title="Зажмите и вращайте модель в 3D"
              />
            </>
          )}

          {cameraError && (
            <div className="absolute top-3 left-3 right-3 z-10 p-2.5 rounded-xl bg-amber-950/85 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{cameraError}</span>
            </div>
          )}

          {step.arrowDirection && !is2DFallback && (
            <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-sm border border-slate-800 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
              <div className="p-1 rounded-lg bg-emerald-500/15 text-emerald-400">
                {step.arrowDirection === 'rotate-ccw' && <RotateCcw className="w-4 h-4" />}
                {step.arrowDirection === 'rotate-cw' && <RotateCw className="w-4 h-4" />}
                {(step.arrowDirection === 'pull-forward' || step.arrowDirection === 'push') && (
                  <ArrowRight className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="font-semibold text-slate-200">
                  {step.arrowDirection === 'rotate-ccw' && 'Вращайте против часовой стрелки'}
                  {step.arrowDirection === 'rotate-cw' && 'Закрутите по часовой стрелке'}
                  {step.arrowDirection === 'pull-forward' && 'Аккуратно потяните на себя'}
                  {step.arrowDirection === 'push' && 'Зафиксируйте до упора'}
                </div>
                <div className="text-[11px] text-slate-400">Точка контакта подсвечена в 3D</div>
              </div>
            </div>
          )}

          {isRulerActive && (
            <svg
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full z-10 pointer-events-none"
            >
              {measurements.map((m, idx) => {
                const x1 = m.p1.normX * 1000;
                const y1 = m.p1.normY * 1000;
                const x2 = m.p2.normX * 1000;
                const y2 = m.p2.normY * 1000;
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                const isLatest = idx === 0;
                return (
                  <g key={m.id} opacity={isLatest ? 1 : 0.65}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isLatest ? '#22d3ee' : '#94a3b8'}
                      strokeWidth={isLatest ? 4 : 2.5}
                      strokeDasharray={m.depthSource === '3d-raycast' ? undefined : '12 8'}
                    />
                    <circle cx={x1} cy={y1} r={8} fill="#06b6d4" stroke="#0c0f17" strokeWidth={3} />
                    <circle cx={x2} cy={y2} r={8} fill="#10b981" stroke="#0c0f17" strokeWidth={3} />
                    <rect
                      x={Math.max(20, Math.min(820, mx - 76))}
                      y={Math.max(18, Math.min(940, my - 22))}
                      width={152}
                      height={36}
                      rx={10}
                      fill="#0c0f17"
                      fillOpacity={0.9}
                      stroke={isLatest ? '#22d3ee' : '#475569'}
                      strokeWidth={2}
                    />
                    <text
                      x={Math.max(96, Math.min(896, mx))}
                      y={Math.max(41, Math.min(963, my + 2))}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="20"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {formatRulerLength(m.distanceMm, rulerUnit)}
                    </text>
                  </g>
                );
              })}

              {rulerDraftPoint && (
                <g>
                  <circle
                    cx={rulerDraftPoint.normX * 1000}
                    cy={rulerDraftPoint.normY * 1000}
                    r={11}
                    fill="#f59e0b"
                    stroke="#0c0f17"
                    strokeWidth={3}
                  />
                  {hoverNormPos && (
                    <line
                      x1={rulerDraftPoint.normX * 1000}
                      y1={rulerDraftPoint.normY * 1000}
                      x2={hoverNormPos.normX * 1000}
                      y2={hoverNormPos.normY * 1000}
                      stroke="#fbbf24"
                      strokeWidth={3}
                      strokeDasharray="10 8"
                    />
                  )}
                </g>
              )}
            </svg>
          )}

          {isRulerActive && (
            <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-sm border border-cyan-500/40 text-xs text-slate-100 pointer-events-none">
              {rulerDraftPoint
                ? 'Нажмите точку 2 на детали или отверстии'
                : 'AR-линейка: нажмите точку 1 для начала замера'}
            </div>
          )}

          {!is2DFallback && !isRulerActive && (
            <div className="hidden sm:flex absolute bottom-4 right-4 z-10 bg-slate-900/85 backdrop-blur-sm border border-slate-800 text-[11px] text-slate-400 px-2.5 py-1.5 rounded-lg pointer-events-none">
              Вращение: мышь или свайп · Масштаб: колесо
            </div>
          )}
        </div>

        {/* AR-линейка: панель глубины сцены и результатов замеров */}
        {isRulerActive && (
          <div
            data-testid="ar-ruler-panel"
            className="p-4 sm:p-5 bg-slate-950/80 border-t border-slate-800 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                <Ruler className="w-4 h-4" />
                <span>AR-линейка · Замер по глубине сцены</span>
                {depthSensingSupported && (
                  <span className="text-[11px] font-normal text-emerald-400">
                    (WebXR Depth готов)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isCameraActive && !is2DFallback && (
                  <button
                    type="button"
                    onClick={() => setHide3DInCameraRuler((v) => !v)}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      hide3DInCameraRuler
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {hide3DInCameraRuler ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    <span>{hide3DInCameraRuler ? 'Показать 3D-макет' : 'Только камера'}</span>
                  </button>
                )}

                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRulerUnit('mm')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      rulerUnit === 'mm' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    мм
                  </button>
                  <button
                    type="button"
                    onClick={() => setRulerUnit('cm')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      rulerUnit === 'cm' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    см
                  </button>
                </div>

                {(measurements.length > 0 || rulerDraftPoint) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMeasurements([]);
                      setRulerDraftPoint(null);
                      setHoverNormPos(null);
                    }}
                    className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Очистить</span>
                  </button>
                )}
              </div>
            </div>

            {/* Калибровка плоскости глубины для замера через камеру */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="md:col-span-7 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Дистанция до объекта (плоскость глубины камеры)
                  </span>
                  <span className="font-mono tabular-nums text-white font-semibold">
                    {cameraDepthMeters.toFixed(2)} м
                  </span>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={2.5}
                  step={0.05}
                  value={cameraDepthMeters}
                  onChange={(e) => setCameraDepthMeters(Number(e.target.value))}
                  aria-label="Дистанция до плоскости замера"
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-1.5">
                {[
                  { label: '0.4 м (близко)', val: 0.4 },
                  { label: '0.65 м (рука)', val: 0.65 },
                  { label: '1.2 м (корпус)', val: 1.2 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setCameraDepthMeters(preset.val)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                      Math.abs(cameraDepthMeters - preset.val) < 0.03
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {measurements.length > 0 && (
              <div className="divide-y divide-slate-800 rounded-xl bg-slate-900 border border-slate-800 px-3.5">
                {measurements.map((m, idx) => (
                  <div
                    key={m.id}
                    data-testid="ar-ruler-measurement-row"
                    className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-slate-500">#{measurements.length - idx}</span>
                      <span className="font-bold font-mono tabular-nums text-white text-sm">
                        {formatRulerLength(m.distanceMm, rulerUnit)}
                      </span>
                      <span className="text-slate-400 font-mono tabular-nums">
                        (ΔX {m.dxMm} · ΔY {m.dyMm} · ΔZ {m.dzMm} мм)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="font-mono tabular-nums">
                        Глубина: {m.avgDepthMeters.toFixed(2)} м
                      </span>
                      <span>
                        {m.depthSource === '3d-raycast'
                          ? '3D-геометрия'
                          : m.depthSource === 'webxr-depth'
                          ? 'WebXR Depth'
                          : 'Глубина камеры'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMeasurements((prev) => prev.filter((item) => item.id !== m.id))
                        }
                        aria-label="Удалить замер"
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step Details & Controls */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 space-y-4">
          {step.safetyWarning && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/35 text-rose-200 text-xs sm:text-sm flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-300">Техника безопасности: </span>
                {step.safetyWarning}
              </div>
            </div>
          )}

          <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
            {step.description}
          </p>

          {(voiceControl.isListening || voiceControl.lastCommand || voiceControl.voiceError) && (
            <div className="text-xs text-slate-400">
              {voiceControl.voiceError ? (
                <span className="text-amber-300">{voiceControl.voiceError}</span>
              ) : voiceControl.isListening ? (
                <span>
                  Голосовое управление активно · скажите «следующий шаг», «повтори», «назад» или «стоп»
                </span>
              ) : (
                <span>Последняя команда: «{voiceControl.lastCommand}»</span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
            {step.toolsRequired.length > 0 && (
              <div className="text-slate-400">
                Инструменты:{' '}
                <span className="font-medium text-amber-300">
                  {step.toolsRequired.join(', ')}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => onStepComplete(step.stepNumber)}
              className={`ml-auto min-h-[40px] flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-colors text-xs font-semibold whitespace-nowrap ${
                isStepDone
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              <CheckCircle2
                className={`w-4 h-4 ${isStepDone ? 'text-emerald-400' : 'text-slate-500'}`}
              />
              <span>{isStepDone ? 'Шаг выполнен' : 'Отметить шаг'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onPrevStep}
              disabled={currentStepIndex === 0}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Назад</span>
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStepIndex
                      ? 'w-6 bg-cyan-400'
                      : idx < currentStepIndex
                      ? 'w-2 bg-emerald-400'
                      : 'w-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={onNextStep}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{currentStepIndex === totalSteps - 1 ? 'Завершить ремонт' : 'Далее'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Parts & Safety Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-white text-sm">Необходимые запчасти</h3>
            <span className="text-xs text-slate-400">Артикулы и цены</span>
          </div>
          <div className="divide-y divide-slate-800">
            {guide.partsLinks.map((part, idx) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{part.name}</div>
                  <div className="text-slate-400 font-mono mt-0.5">
                    {part.partNumber} · {part.shop}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-white font-mono tabular-nums">
                    {part.price.toLocaleString('ru-RU')} ₽
                  </div>
                  <a
                    href={part.linkUrl}
                    onClick={(e) => e.preventDefault()}
                    className="text-[11px] text-cyan-400 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                  >
                    <span>В магазин</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Инструменты и защита</span>
          </h3>
          <div className="space-y-3 text-xs text-slate-300">
            <div>
              <div className="text-slate-400 mb-1">Потребуется:</div>
              <div>{guide.tools.join(' · ')}</div>
            </div>
            <div className="border-t border-slate-800 pt-2.5">
              <div className="text-slate-400 mb-1">Обязательные меры:</div>
              <div className="text-rose-300">{guide.safetyGear.join(' · ')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
