import * as THREE from 'three';

export interface ARSupportInfo {
  webglAvailable: boolean;
  isSoftwareGl: boolean;
  webxrSupported: boolean;
  depthSensingSupported: boolean;
}

/**
 * Проверка поддержки WebGL / программного рендера (SwiftShader/llvmpipe) и WebXR / depth-sensing
 */
export async function detectARSupport(): Promise<ARSupportInfo> {
  let webglAvailable = false;
  let isSoftwareGl = false;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      webglAvailable = true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    webglAvailable = false;
  }

  let webxrSupported = false;
  const depthSensingSupported =
    typeof window !== 'undefined' && 'XRDepthInformation' in window;
  try {
    if (typeof navigator !== 'undefined' && 'xr' in navigator && (navigator as any).xr) {
      webxrSupported = await (navigator as any).xr.isSessionSupported('immersive-ar');
    }
  } catch {
    webxrSupported = false;
  }

  return { webglAvailable, isSoftwareGl, webxrSupported, depthSensingSupported };
}

/**
 * Построение многокомпонентной PBR 3D-модели техники/мебели (3-12 деталей с разной шероховатостью)
 */
export function buildCompositeModel(
  modelType: 'washing_machine' | 'microwave' | 'vacuum' | 'chair' | 'fridge'
): {
  group: THREE.Group;
  parts: Record<string, THREE.Object3D>;
} {
  const group = new THREE.Group();
  const parts: Record<string, THREE.Object3D> = {};

  if (modelType === 'washing_machine') {
    // 1. Корпус (матовый эмалированный металл)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.56, 1.9, 1.44),
      new THREE.MeshStandardMaterial({ color: 0x3b495e, metalness: 0.32, roughness: 0.42 })
    );
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    parts['body'] = body;

    // 2. Верхняя панель управления
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.54, 0.3, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.2, roughness: 0.2 })
    );
    panel.position.set(0, 0.78, 0.74);
    group.add(panel);

    // 3. LED-дисплей
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.16),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.7,
        roughness: 0.15,
      })
    );
    screen.position.set(0.32, 0.78, 0.785);
    group.add(screen);

    // 4. Селектор программ (ручка)
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.2 })
    );
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0, 0.78, 0.79);
    group.add(knob);

    // 5. Лоток моющих средств
    const drawer = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.22, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.1, roughness: 0.6 })
    );
    drawer.position.set(-0.5, 0.78, 0.62);
    group.add(drawer);
    parts['drawer'] = drawer;

    // 6. Обод дверцы люка (шлифованный хром)
    const doorRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.075, 20, 48),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.88, roughness: 0.18 })
    );
    doorRing.position.set(0, 0.06, 0.74);
    group.add(doorRing);
    parts['door'] = doorRing;

    // 7. Стекло люка (физический материал)
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.41, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        roughness: 0.08,
        metalness: 0.05,
      })
    );
    glass.rotation.x = Math.PI / 2;
    glass.position.set(0, 0.06, 0.74);
    group.add(glass);

    // 8. Внутренний барабан (перфорированная сталь)
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.6, 24, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.85,
        roughness: 0.3,
        side: THREE.DoubleSide,
      })
    );
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, 0.06, 0.35);
    group.add(drum);

    // 9. Сервисный люк фильтра (правый нижний угол)
    const serviceFlap = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.26, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.4, roughness: 0.45 })
    );
    serviceFlap.position.set(0.55, -0.68, 0.75);
    group.add(serviceFlap);
    parts['service_door'] = serviceFlap;

    // 10. Узел сливного фильтра
    const filterUnit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.24, 24),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.35, metalness: 0.1 })
    );
    filterUnit.rotation.x = Math.PI / 2;
    filterUnit.position.set(0.58, -0.68, 0.74);
    group.add(filterUnit);
    parts['filter_assembly'] = filterUnit;

    // 11. Аварийный шланг
    const hose = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, metalness: 0 })
    );
    hose.position.set(0.42, -0.72, 0.75);
    group.add(hose);
    parts['drain_hose'] = hose;
  } else if (modelType === 'microwave') {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.08, 1.24),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.45, roughness: 0.35 })
    );
    group.add(body);
    parts['mw_casing'] = body;

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.92, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.2, roughness: 0.15 })
    );
    door.position.set(-0.26, 0, 0.65);
    group.add(door);
    parts['mw_door'] = door;

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.72, 12),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.15 })
    );
    handle.position.set(0.24, 0, 0.72);
    group.add(handle);

    const ctrl = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.92, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.3 })
    );
    ctrl.position.set(0.62, 0, 0.64);
    group.add(ctrl);

    const magnetron = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.42, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 })
    );
    magnetron.position.set(0.55, 0.12, 0);
    group.add(magnetron);
    parts['magnetron'] = magnetron;

    const fuse = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.24, 16),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.55,
        roughness: 0.3,
      })
    );
    fuse.rotation.z = Math.PI / 4;
    fuse.position.set(0.5, -0.2, 0.22);
    group.add(fuse);
    parts['mw_fuse'] = fuse;
  } else if (modelType === 'chair') {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x7c4a2d,
      roughness: 0.72,
      metalness: 0.05,
    });
    const legGeo = new THREE.CylinderGeometry(0.042, 0.028, 1.15, 16);
    [
      [-0.38, -0.58, -0.38],
      [0.38, -0.58, -0.38],
      [-0.38, -0.58, 0.38],
      [0.38, -0.58, 0.38],
    ].forEach(([x, y, z], i) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(x, y, z);
      group.add(leg);
      parts[`leg_${i}`] = leg;
    });

    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.54, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0xd8ceb8, roughness: 0.88, metalness: 0 })
    );
    seat.position.set(0, 0.04, 0);
    group.add(seat);
    parts['chair_seat'] = seat;

    const back = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.04, 16, 36, Math.PI),
      woodMat
    );
    back.position.set(0, 0.65, -0.36);
    group.add(back);
    parts['chair_back'] = back;
  } else {
    // Vacuum cleaner
    const vacBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.22, 0.86, 24),
      new THREE.MeshStandardMaterial({ color: 0x5b21b6, metalness: 0.4, roughness: 0.35 })
    );
    group.add(vacBody);
    parts['vac_body'] = vacBody;

    const bin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.42, 24),
      new THREE.MeshPhysicalMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.45,
        roughness: 0.15,
      })
    );
    bin.position.set(0, -0.22, 0.15);
    group.add(bin);
    parts['vac_bin'] = bin;

    const filterCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.18, 24),
      new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        emissive: 0x6d28d9,
        emissiveIntensity: 0.35,
        roughness: 0.5,
      })
    );
    filterCap.position.set(0, 0.55, 0);
    group.add(filterCap);
    parts['vac_filter'] = filterCap;

    const brushHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.12, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.3, roughness: 0.5 })
    );
    brushHead.position.set(0, -0.78, 0.12);
    group.add(brushHead);
    parts['vac_brush'] = brushHead;
  }

  return { group, parts };
}

/**
 * Освобождение геометрий и материалов при размонтировании сцены
 */
export function disposeThreeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m?.dispose());
    }
  });
}
