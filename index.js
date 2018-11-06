if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container;
var camera, scene, renderer;

var earthMesh;
var video, videoTexture,videoMaterial;
var mouseCoords = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var stars = [];
var starMeshes = [];
var pos = new THREE.Vector3();
var quat = new THREE.Quaternion();
var particleSystem;
var particles = [];
var r = 6000;
var x = 10;
var start_time = Date.now();
var clock = new THREE.Clock();
var time = 0;

// Physics variables
var gravityConstant = 7.8;
var collisionConfiguration;
var dispatcher;
var broadphase;
var solver;
var physicsWorld;
var margin = 0.05;
var rigidBodies = [];
var transformAux1 = new Ammo.btTransform();
var tempBtVec3_1 = new Ammo.btVector3( 0, 0, 0 );

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

var text = document.getElementById("words");


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
  // var controls = new THREE.OrbitControls( camera, renderer.domElement );
  // controls.target.set( 0, 1, 0 );
  // controls.update();

  initPhysics();
  skyParticles();
  tunnel();
  yellowStars();
  earthMoving();
  song();
  badTVeffect();
}

function initPhysics() {
		// Physics configuration
		collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
		broadphase = new Ammo.btDbvtBroadphase();
		solver = new Ammo.btSequentialImpulseConstraintSolver();
		physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
		physicsWorld.setGravity( new Ammo.btVector3( 0, 0, 0 ) );
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

  function createRigidBody( object, physicsShape, mass, pos, quat, vel, angVel ) {
    if ( pos ) {
    	object.position.copy( pos );
    }
    else {
    	pos = object.position;
    }
    if ( quat ) {
    	object.quaternion.copy( quat );
    }
    else {
    	quat = object.quaternion;
    }
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    var motionState = new Ammo.btDefaultMotionState( transform );
    var localInertia = new Ammo.btVector3( 0, 0, 0 );
    physicsShape.calculateLocalInertia( mass, localInertia );
    var rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
    var body = new Ammo.btRigidBody( rbInfo );
    body.setFriction( 0.5 );
    if ( vel ) {
    	body.setLinearVelocity( new Ammo.btVector3( vel.x, vel.y, vel.z ) );
    }
    if ( angVel ) {
    	body.setAngularVelocity( new Ammo.btVector3( angVel.x, angVel.y, angVel.z ) );
    }
    object.userData.physicsBody = body;
    object.userData.collided = false;
    scene.add( object );
    if ( mass > 0 ) {
    	rigidBodies.push( object );
    	// Disable deactivation
    	body.setActivationState( 4 );
    }
    physicsWorld.addRigidBody( body );
    console.log(body);
    return body;
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
      amount: 5, size: 0.3, height: 0.3, curveSegments: 3,
      bevelThickness: 0.3, bevelSize: 2, bevelEnabled: false,
      material: 0, extrudeMaterial: 0.3
  };

  var starGeometry = new THREE.ExtrudeGeometry( starShape, extrusionSettings );
  // for ( var i = 0; i < 40; i ++ ) {
  //   stars.push( starGeometry );
  // }

  var starMaterial = new THREE.MeshPhongMaterial( {
  color: 0xFFFF00,
  shininess: 100,
  specular: 0x111111,
  shading: THREE.SmoothShading
  } );

  // for ( var j = 0; j < stars.length; j ++ ) {
  //   var starMesh = new THREE.Mesh( stars[j], starMaterial );
  //   starMesh.position.set( THREE.Math.randInt(-50,50), THREE.Math.randInt(-420,-380), 8000 );
  //   starMesh.scale.multiplyScalar( THREE.Math.randFloat(0.2,0.5) );
  //   starMesh.receiveShadow = true;
  //   starMeshes.push(starMesh);
  //   scene.add( starMesh );
  // }

  window.addEventListener( 'mousedown', function( event ) {
  	mouseCoords.set(
  		( event.clientX / window.innerWidth ) * 2 - 1,
  		- ( event.clientY / window.innerHeight ) * 2 + 1
  	);
  	raycaster.setFromCamera( mouseCoords, camera );
  	// Creates a ball and throws it
  	//var ballMass = 35;
  	//var ballRadius = 0.4;
    var starMesh = new THREE.Mesh( starGeometry, starMaterial );
  	//var ball = new THREE.Mesh( new THREE.SphereGeometry( ballRadius, 14, 10 ), ballMaterial );
  	starMesh.castShadow = true;
  	starMesh.receiveShadow = true;
  	var ballShape = new Ammo.btSphereShape( 0.3 );
  	ballShape.setMargin( margin );
  	pos.copy( raycaster.ray.direction );
  	pos.add( raycaster.ray.origin );
  	quat.set( 0, 0, 0, 1 );
  	var ballBody = createRigidBody( starMesh, ballShape, 1, pos, quat );
  	pos.copy( raycaster.ray.direction );
  	pos.multiplyScalar( 100 );
  	ballBody.setLinearVelocity( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
  }, false );

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
  requestAnimationFrame( animate );
  render();
}

function render() {
  var deltaTime = clock.getDelta();
  updatePhysics( deltaTime );
  //console.log(physicsWorld);
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

  if (x == 600) {
    x = -5;
  } else {
    x=x+5;
  };

  if (camera.position.z > 50) {
    camera.position.z = - position + 8000;
  }
  if (camera.position.z <= 50){
    camera.lookAt(new THREE.Vector3(0,-400,-10 ));
    composer.render( 0.1);
    stats.update();
  }else{
    renderer.render( scene, camera );
  }
  time += deltaTime;
}

function updatePhysics( deltaTime ) {
			// Step world
			physicsWorld.stepSimulation( deltaTime, 10 );
			// Update rigid bodies
			for ( var i = 0, il = rigidBodies.length; i < il; i++ ) {
				var objThree = rigidBodies[ i ];
				var objPhys = objThree.userData.physicsBody;
        let vec = new Ammo.btVector3(1,1,1);
        objThree.userData.physicsBody.setAngularVelocity( vec );
				var ms = objPhys.getMotionState();
				if ( ms ) {
					ms.getWorldTransform( transformAux1 );
					var p = transformAux1.getOrigin();
					var q = transformAux1.getRotation();
					objThree.position.set( p.x(), p.y(), p.z() );
					objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
					objThree.userData.collided = false;
				}
			}
}
