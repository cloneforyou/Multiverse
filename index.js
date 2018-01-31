if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container;
var camera, scene, renderer;

var earthMesh;
var video, videoTexture,videoMaterial;
var stars = [];
var starMeshes = [];
var particleSystem;
var particles = [];
var r = 6000;
var x = 10;
var start_time = Date.now();
var clock = new THREE.Clock();

var composer;
var shaderTime = 0;
var badTVParams, badTVPass;
var staticParams, staticPass;
var rgbParams, rgbPass;
var filmParams, filmPass;
var renderPass, copyPass;
var pnoise, globalParams;

var partciles = [];
var tubeUniforms,uniforms2;
var refractSphereCamera;


init();

function init() {
  container = document.createElement( 'div' );
  document.body.appendChild( container );

  var canvas = document.createElement( 'canvas' );
  canvas.width = 32;
  canvas.height = window.innerHeight;

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 5000 );
  camera.position.z = 8000;

  scene = new THREE.Scene();

  var cloudGeo = new THREE.Geometry();

  var cloudTexture = THREE.ImageUtils.loadTexture( 'img/cloud10.png', null, animate );
  cloudTexture.magFilter = THREE.LinearMipMapLinearFilter;
  cloudTexture.minFilter = THREE.LinearMipMapLinearFilter;

  var fog = new THREE.Fog( 0x4584b4, - 100, 3000 );

  var cloudMaterial = new THREE.ShaderMaterial( {
    uniforms: {
      "map": { type: "t", value: cloudTexture },
      "fogColor" : { type: "c", value: fog.color },
      "fogNear" : { type: "f", value: fog.near },
      "fogFar" : { type: "f", value: fog.far },
    },
    vertexShader: document.getElementById( 'vs' ).textContent,
    fragmentShader: document.getElementById( 'fs' ).textContent,
    depthWrite: false,
    depthTest: false,
    transparent: true
  });

  var cloud = new THREE.Mesh( new THREE.PlaneGeometry( 64, 64 ) );

  for ( var i = 0; i < 20000; i++ ) {
    cloud.position.x = Math.random() * 1000 - 500;
    cloud.position.y = - Math.random() * Math.random() * 200 - 15;
    cloud.position.z = i;
    cloud.rotation.z = Math.random() * Math.PI;
    cloud.scale.x = cloud.scale.y;

    THREE.GeometryUtils.merge( cloudGeo, cloud );
  }

  cloudMesh = new THREE.Mesh( cloudGeo, cloudMaterial );
  scene.add( cloudMesh );

  renderer = new THREE.WebGLRenderer( { antialias: false } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );

  var ambient = new THREE.AmbientLight( 0x333333 );
  light = new THREE.DirectionalLight( 0xffffff );
  light.position.set( -20, -380, 7500 );
  scene.add( light );

  window.addEventListener( 'resize', onWindowResize, false );
  var controls = new THREE.OrbitControls( camera, renderer.domElement );
  controls.target.set( 0, 1, 0 );
  controls.update();

  skyParticles();
  tunnel();
  yellowStars();
  earthMoving();
  song();
  badTVeffect();
}

function badTVeffect(){
  video = document.createElement( 'video' );
  video.loop = true;
  video.src = 'earth/earth.mov';

  videoTexture = new THREE.Texture( video );
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoMaterial = new THREE.MeshBasicMaterial( {
    map: videoTexture
  } );

  var planeGeometry = new THREE.PlaneGeometry( 50, 50,1,1 );
  var plane = new THREE.Mesh( planeGeometry, videoMaterial );
  plane.position.set( 0,-400,-10 );

  renderPass = new THREE.RenderPass( scene, camera );
  badTVPass = new THREE.ShaderPass( THREE.BadTVShader );
  rgbPass = new THREE.ShaderPass( THREE.RGBShiftShader );
  filmPass = new THREE.ShaderPass( THREE.FilmShader );
  staticPass = new THREE.ShaderPass( THREE.StaticShader );
  copyPass = new THREE.ShaderPass( THREE.CopyShader );

  filmPass.uniforms.grayscale.value = 0;

  badTVParams = {
    mute:true,
    show: true,
    distortion: 3.2,
    distortion2: 7.7,
    speed: 0.09,
    rollSpeed: 0
  };
  staticParams = {
    show: true,
    amount:0.03,
    size:12
  };
  rgbParams = {
    show: true,
    amount: 0.0055,
    angle: 1,
  };
  filmParams = {
    show: true,
    count: 800,
    sIntensity: 0.9,
    nIntensity: 0.4
  };

  onToggleShaders();
  onParamsChange();

}

function onParamsChange() {
  badTVPass.uniforms[ 'distortion' ].value = badTVParams.distortion;
  badTVPass.uniforms[ 'distortion2' ].value = badTVParams.distortion2;
  badTVPass.uniforms[ 'speed' ].value = badTVParams.speed;
  badTVPass.uniforms[ 'rollSpeed' ].value = badTVParams.rollSpeed;
  staticPass.uniforms[ 'amount' ].value = staticParams.amount;
  staticPass.uniforms[ 'size' ].value = staticParams.size;
  rgbPass.uniforms[ 'angle' ].value = rgbParams.angle*Math.PI;
  rgbPass.uniforms[ 'amount' ].value = rgbParams.amount;
  filmPass.uniforms[ 'sCount' ].value = filmParams.count;
  filmPass.uniforms[ 'sIntensity' ].value = filmParams.sIntensity;
  filmPass.uniforms[ 'nIntensity' ].value = filmParams.nIntensity;
}

function onToggleShaders(){
  composer = new THREE.EffectComposer( renderer);
  composer.addPass( renderPass );

  if (filmParams.show) {
    composer.addPass( filmPass );
  };
  if (badTVParams.show) {
    composer.addPass( badTVPass );
  };
  if (rgbParams.show){
    composer.addPass( rgbPass );
  };
  if (staticParams.show){
    composer.addPass( staticPass );
  };
  composer.addPass( copyPass );
  copyPass.renderToScreen = true;
}


function song() {
  var audioListener = new THREE.AudioListener();
  var mainSong = new THREE.Audio( audioListener );
  camera.add( audioListener );
  scene.add( mainSong );

  var loader = new THREE.AudioLoader();
  loader.load('music/aboutYou.mp3',
    function ( audioBuffer ) {
      mainSong.setBuffer( audioBuffer );
      mainSong.play();
    },
    function ( xhr ) {
      console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
    },
    function ( xhr ) {
      console.log( 'An error happened' );
    });
}


function earthMoving() {
    var textureLoader = new THREE.TextureLoader();
    var earthMaterial = new THREE.MeshStandardMaterial( {
      color: 0xffffff,
      roughness: 0.5,
      metalness: 1.0
    });
    textureLoader.load( "earth/earth_atmos_2048.jpg", function( map ) {
      map.anisotropy = 4;
      earthMaterial.map = map;
      earthMaterial.needsUpdate = true;
    });
    textureLoader.load( "earth/earth_specular_2048.jpg", function( map ) {
      map.anisotropy = 4;
      earthMaterial.metalnessMap = map;
      earthMaterial.needsUpdate = true;
    });
    var earthGeometry = new THREE.SphereGeometry( 20, 32, 32 );
    earthMesh = new THREE.Mesh( earthGeometry, earthMaterial );
    earthMesh.position.set( 0,-400,-10 );
    earthMesh.rotation.y = Math.PI;
    scene.add( earthMesh );

    var glassBox = new THREE.BoxGeometry( 50, 50, 10 );

    var glassMaterial = new THREE.MeshLambertMaterial({color: 0xffffff, transparent: true, opacity: 0.9});
    var boxMesh = new THREE.Mesh( glassBox, glassMaterial );
    boxMesh.position.set( 0,-400,-10 );
    scene.add(boxMesh);
}

function yellowStars(){
  var starPoints = [];
  starPoints.push( new THREE.Vector3 (  0,  16 ) );
  starPoints.push( new THREE.Vector3 (  4,  4 ) );
  starPoints.push( new THREE.Vector3 (  16,  4 ) );
  starPoints.push( new THREE.Vector3 (  8, -4 ) );
  starPoints.push( new THREE.Vector3 (  12, -16 ) );
  starPoints.push( new THREE.Vector3 (  0, -8 ) );
  starPoints.push( new THREE.Vector3 ( -12, -16 ) );
  starPoints.push( new THREE.Vector3 ( -8, -4 ) );
  starPoints.push( new THREE.Vector3 ( -16,  4 ) );
  starPoints.push( new THREE.Vector3 ( -4,  4 ) );
  starPoints.push( new THREE.Vector3 (  0,  16 ) );

  var starShape = new THREE.Shape( starPoints );
  var extrusionSettings = {
      amount: 5, size: 1, height: 1, curveSegments: 3,
      bevelThickness: 1, bevelSize: 2, bevelEnabled: false,
      material: 0, extrudeMaterial: 1
  };

  var starGeometry = new THREE.ExtrudeGeometry( starShape, extrusionSettings );
  for ( var i = 0; i < 40; i ++ ) {
    stars.push( starGeometry );
  }

  var starMaterial = new THREE.MeshPhongMaterial( {
  color: 0xFFFF00,
  shininess: 100,
  specular: 0x111111,
  shading: THREE.SmoothShading
  } );

  for ( var j = 0; j < stars.length; j ++ ) {
    var starMesh = new THREE.Mesh( stars[j], starMaterial );
    starMesh.position.set( THREE.Math.randInt(-50,50), THREE.Math.randInt(-420,-380), 8000 );
    starMesh.scale.multiplyScalar( THREE.Math.randFloat(0.2,0.5) );
    starMesh.receiveShadow = false;
    starMeshes.push(starMesh);
    scene.add( starMesh );
  }
}

function tunnel() {
  tubeUniforms = {
    time:       { value: 1.0 },
    resolution: { value: new THREE.Vector2() }
  };

  var holeMaterial = new THREE.ShaderMaterial( {
    uniforms: tubeUniforms,
    vertexShader: document.getElementById( 'vs' ).textContent,
    fragmentShader: document.getElementById( 'fragment_shader1' ).textContent,
    side: THREE.DoubleSide,
  } );

  var tubepath1 = [{"point" :new THREE.Vector3(0,0,r)},{"point" :new THREE.Vector3(0,0,9000)}];
  var tubepoints =[];

  for(var i=0; i<tubepath1.length; i++) {
    tubepoints.push(tubepath1[i].point);
  }

  var actualextrudePath = new THREE.SplineCurve3(tubepoints);
  actualextrudePath.dynamic = true;

  var tube = new THREE.TubeGeometry( actualextrudePath, 100, 50, 100, false );
  tube.dynamic = true;
  tube.verticesNeedUpdate = true;
  tube.dynamic = true;
  var tubeMaterial = new THREE.MeshBasicMaterial( {color: 0x210039, side: THREE.DoubleSide} );

  var tubeMesh = new THREE.Mesh( tube, holeMaterial );
  tubeMesh.position.y = -400;
  scene.add( tubeMesh );
}

function skyParticles() {
  var particles = new THREE.Geometry();
  var pMaterial = new THREE.ParticleBasicMaterial({ color: 0xFFFFFF, size: 20, map: THREE.ImageUtils.loadTexture( "img/particle.png"),
  blending: THREE.AdditiveBlending, transparent: true });

  for ( var i = 0; i < 800000; i ++ ) {
    var vertex = new THREE.Vector3();
    vertex.x = THREE.Math.randFloatSpread( 15000 );
    vertex.y = THREE.Math.randFloatSpread( 20000 );
    vertex.z = THREE.Math.randFloat(100, 15000 );
    particles.vertices.push( vertex );
  }

  particleSystem = new THREE.ParticleSystem( particles, pMaterial);
  particleSystem.sortParticles = true;
  scene.add(particleSystem);
}

function onWindowResize( event ) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
  if (camera.position.z <= 100) {
    shaderTime+=0.01;
    badTVPass.uniforms[ 'time' ].value =  shaderTime;
    filmPass.uniforms[ 'time' ].value =  shaderTime;
    staticPass.uniforms[ 'time' ].value =  shaderTime;
    if ( video.readyState === video.HAVE_ENOUGH_DATA ) {
      if ( videoTexture ) videoTexture.needsUpdate = true;
    }
  }

  position = ( ( Date.now() - start_time ) * 0.03 ) % 8000;
  camera.position.y = -400;
  tubeUniforms.time.value += 0.01;
  r -= 100;
  earthMesh.rotation.y += 0.01;

  for (var b = 0; b < starMeshes.length; b++){
    starMeshes[b].rotation.z += 0.01;
    starMeshes[b].rotation.x += 0.01;
  }

  for (var b = 0; b < starMeshes.length; b++) {
    if (b == 0) {
      if (starMeshes[b].position.z != 0 && camera.position.z > 6000){
        starMeshes[b].position.z -= 2;
      } else {
        starMeshes[b].position.z = 8000;
      }
    } else {
      if (starMeshes[b-1].position.z < 7500 && starMeshes[b].position.z != 0 && camera.position.z > 6000){
        starMeshes[b].position.z -= 2;
      } else {
      starMeshes[b].position.z = 8000;
      }
    }
  };

  if (x == 600) {
    x = -5;
  } else {
    x=x+5;
  };

  if (camera.position.z > 50) {
    camera.position.z = - position + 8000;
  }

  requestAnimationFrame( animate );
  if (camera.position.z <= 50){
    camera.lookAt(new THREE.Vector3(0,-400,-10 ));
    composer.render( 0.1);
    stats.update();
  }else{
    renderer.render( scene, camera );
  }
}
