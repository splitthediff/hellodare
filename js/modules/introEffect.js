// --- START OF FILE js/modules/introEffect.js ---

let stage, renderer, text, displacementSprite, displacementFilter;
let animationFrameId;

function ease(current, target, ease = 0.1) {
  return current + (target - current) * ease;
}

// --- Main Exported Functions ---

export function initIntroEffect(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error("Intro effect container not found.");
    return;
  }

  // Create PixiJS stage and renderer
  const width = container.clientWidth;
  const height = container.clientHeight;
  stage = new PIXI.Container();
  renderer = new PIXI.Renderer({
    width,
    height,
    transparent: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  container.appendChild(renderer.view);

  // Create Displacement Sprite & Filter
  displacementSprite = PIXI.Sprite.from(
    "https://s3-us-west-2.amazonaws.com/s.cdpn.io/39255/displacement-cross-2.jpg"
  );
  displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
  displacementFilter = new PIXI.filters.DisplacementFilter(displacementSprite);
  displacementFilter.scale.x = 0; // Start with no distortion
  displacementFilter.scale.y = 0;
  stage.addChild(displacementSprite);

  // Create the Text
  const style = new PIXI.TextStyle({
    fontFamily: '"neue-haas-unica", helvetica, sans-serif',
    fontSize: 24, // Adjust as needed
    fontWeight: "600",
    fill: "#231F20", // Your primary text color
    align: "center",
    wordWrap: true,
    wordWrapWidth: width * 0.8,
  });
  text = new PIXI.Text("STUDIO DARE\nSELECTED WORK\n\nSCROLL TO VIEW", style);
  text.anchor.set(0.5);
  text.x = width / 2;
  text.y = height / 2;
  text.filters = [displacementFilter];
  stage.addChild(text);

  // Mouse tracking for distortion
  let mouse = { x: width / 2, y: height / 2 };
  container.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX - container.getBoundingClientRect().left;
    mouse.y = e.clientY - container.getBoundingClientRect().top;
  });

  // Animation Loop
  function animate() {
    // Make the distortion follow the mouse smoothly
    displacementFilter.scale.x = ease(displacementFilter.scale.x, 30, 0.05);
    displacementFilter.scale.y = ease(displacementFilter.scale.y, 30, 0.05);
    displacementSprite.x = ease(displacementSprite.x, mouse.x, 0.05);
    displacementSprite.y = ease(displacementSprite.y, mouse.y, 0.05);

    renderer.render(stage);
    animationFrameId = requestAnimationFrame(animate);
  }
  animate();
}

export function destroyIntroEffect() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (renderer) {
    renderer.destroy(true); // true removes the canvas from the DOM
    stage = null;
    renderer = null;
  }
}
