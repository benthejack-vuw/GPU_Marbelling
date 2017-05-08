var Marbling_Settings = {
	
	particleCountSQRT:600,
	particleSize:6,
	velocityResolution:64,
	velocityFalloff:0.97,
	trackingSpeed:0.125,
	texture:"images/lines-horizontal.png",

	//changed with html controls
	comb:null,

	//interaction honing
	lengthCutoff:0.01,
	tinyVecMult:100.0

}

var Marbling_Globals = {
	WIDTH:window.innerWidth,
	HEIGHT:window.innerHeight,
	renderer:null,
	stats:null,
	gpuCompute:null,
	interactionPos:[],
	spreadAmount:1.0/Marbling_Settings.velocityResolution
}

function Comb(i_space, i_angle){
	this.space = i_space;
	this.angle = i_angle;
}

window.onload=function(){

	init();
	animate();

};

function init() {

	Marbling_Globals.renderer = new THREE.WebGLRenderer({preserveDrawingBuffer:true});
	Marbling_Globals.renderer.setPixelRatio( window.devicePixelRatio );
	Marbling_Globals.renderer.setSize( Marbling_Globals.WIDTH, Marbling_Globals.HEIGHT );

	Marbling_Globals.gpuCompute = new GPUComputeProgram(Marbling_Globals.renderer);

	Marbling_Globals.velocityHBPass = createVelocityBlurPass(THREE.HorizontalBlurShader);
	Marbling_Globals.gpuCompute.addPass(Marbling_Globals.velocityHBPass);

	Marbling_Globals.velocityVBPass = createVelocityBlurPass(THREE.VerticalBlurShader);
	Marbling_Globals.gpuCompute.addPass(Marbling_Globals.velocityVBPass);

	Marbling_Globals.velocityVBPass.shaderMaterial.uniforms.computedOutput.value = Marbling_Globals.velocityHBPass.getOutputTexture();
	Marbling_Globals.velocityHBPass.shaderMaterial.uniforms.computedOutput.value = Marbling_Globals.velocityVBPass.getOutputTexture();
	Marbling_Globals.velocityHBPass.clearWithFloatValues(0.5,0.5,0.5,1.0, Marbling_Globals.renderer);
	Marbling_Globals.velocityVBPass.clearWithFloatValues(0.5,0.5,0.5,1.0, Marbling_Globals.renderer);


	Marbling_Globals.positionPass = createPositionIntegrationPass(Marbling_Globals.velocityVBPass);
	Marbling_Globals.gpuCompute.addPass(Marbling_Globals.positionPass);


	var imgPass = createImagePlanePass(THREE.ImageUtils.loadTexture(Marbling_Settings.texture), {x:Marbling_Settings.width, y:Marbling_Settings.HEIGHT});
	Marbling_Globals.gpuCompute.addPass(imgPass);

	//var outputPass = createTestOutputPass(Marbling_Globals.positionPass);
	var outputPass = createOutputPass(Marbling_Globals.positionPass);
	Marbling_Globals.gpuCompute.addPass(outputPass);


	var container = document.getElementById( 'container' );
	container.appendChild( Marbling_Globals.renderer.domElement );

	Marbling_Globals.stats = new Stats();
	Marbling_Globals.stats.domElement.style.position = 'absolute';
	Marbling_Globals.stats.domElement.style.top = '0px';
	container.appendChild( Marbling_Globals.stats.domElement );


	window.addEventListener( 'resize', onWindowResize, false );

	Marbling_Globals.renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
	Marbling_Globals.renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
	Marbling_Globals.renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );

	Marbling_Globals.renderer.domElement.addEventListener( 'touchstart', onDocumentMouseDown, false );
	Marbling_Globals.renderer.domElement.addEventListener( 'touchmove', onDocumentMouseMove, false );
	Marbling_Globals.renderer.domElement.addEventListener( 'touchend', onDocumentMouseUp, false );

	var useComb   = document.getElementById(  'useComb'  );
	var combSpace = document.getElementById( 'combSpace' );
	var combAngle = document.getElementById( 'combAngle' );

	function combUpdate(){
		
		if(useComb.checked){
			if(!Marbling_Settings.comb){
				Marbling_Settings.comb = new Comb(combSpace.value*Marbling_Settings.velocityResolution, combAngle.value);
			}else{
				Marbling_Settings.comb.space = combSpace.value*Marbling_Settings.velocityResolution;
				Marbling_Settings.comb.angle = combAngle.value;
			}
		}else{
			Marbling_Settings.comb = null
		}

		console.log(Marbling_Settings.comb);
	}

	useComb.addEventListener('change', combUpdate);
	combSpace.addEventListener('change', combUpdate);		
	combAngle.addEventListener('change', combUpdate);
}



function createVelocityBlurPass(i_shader){

	var blur_Uniforms = {

		amt: { type: "f", value: 1.0/Marbling_Settings.velocityResolution},
		velocityFalloff: { type: "f", value: Marbling_Settings.velocityFalloff },
		computedOutput: { type: "t", value:null }

	};

	var blur_shaderMaterial = new THREE.ShaderMaterial( {

		uniforms:       blur_Uniforms,
		vertexShader:   i_shader.vertexShader,
		fragmentShader: i_shader.fragmentShader,

		blending:       THREE.NormalBlending,
		depthTest:      false,
		transparent:    false

	});


	var blur = new ComputePass({x: Marbling_Settings.velocityResolution, y: Marbling_Settings.velocityResolution}, blur_shaderMaterial, false, THREE.FloatType);
	return blur;

}

function createPositionIntegrationPass(i_velocityPass){


	var positionUniforms = {

		speed: {type:"f", value:Marbling_Settings.trackingSpeed},
		velocities: {type:"t", value:i_velocityPass.getOutputTexture()},
		computedOutput: { type: "t", value:null }

	};

	var positionShaderMaterial = new THREE.ShaderMaterial( {

		uniforms:       positionUniforms,
		vertexShader:   SHADER.VertexPassThrough,
		fragmentShader: SHADER.FragmentPositionIntegration,

		blending:       THREE.NormalBlending,
		depthTest:      false,
		transparent:    false

	});

	var posPassData = [];
	var step = 1.0/Marbling_Settings.particleCountSQRT;
	for(var i = 0; i < Marbling_Settings.particleCountSQRT*Marbling_Settings.particleCountSQRT; ++i){
		posPassData.push((i%Marbling_Settings.particleCountSQRT)*step);
		posPassData.push(Math.floor(i/Marbling_Settings.particleCountSQRT)*step);
		posPassData.push(0.0);
		posPassData.push(1.0);
	}

	var sze = {x: Marbling_Settings.particleCountSQRT, y: Marbling_Settings.particleCountSQRT};
	var posAdd = new ComputePass(sze, positionShaderMaterial, true, THREE.FloatType);
	posAdd.initData(Marbling_Settings.particleCountSQRT, Marbling_Settings.particleCountSQRT, posPassData);

	return posAdd;

}

function createOutputPass(i_positionPass){
	
	output_scene = new THREE.Scene();
	output_camera = new THREE.OrthographicCamera(0, Marbling_Globals.WIDTH, Marbling_Globals.HEIGHT, 0, -10000, 10000);
	output_camera.position.z = 100;

	var marble_texture = THREE.ImageUtils.loadTexture(Marbling_Settings.texture, THREE.UVMapping, 
		function(){
			marble_texture.minFilter = THREE.LinearFilter;
		}
	);

	/*var planeMaterial = new THREE.MeshBasicMaterial({map:marble_texture});
	var planeGeom = new THREE.PlaneGeometry( Marbling_Globals.WIDTH, Marbling_Globals.HEIGHT );
	planeGeom.translate ( Marbling_Globals.WIDTH/2, Marbling_Globals.HEIGHT/2, 0);

	var planeMesh = new THREE.Mesh(planeGeom, planeMaterial);
	output_scene.add(planeMesh);*/

	var output_uniforms = {

		particleSize: { type: "f", value: Marbling_Settings.particleSize},
		viewSize: { type: "v2", value: new THREE.Vector2(Marbling_Globals.WIDTH, Marbling_Globals.HEIGHT)},
		textureSize: { type: "v2", value: new THREE.Vector2(Marbling_Settings.particleCountSQRT, Marbling_Settings.particleCountSQRT)},
		positionTexture:   { type: "t", value: i_positionPass.getOutputTexture() },
		colorTexture:   { type: "t", value: marble_texture }

	};

	var output_shaderMaterial = new THREE.ShaderMaterial( {

		uniforms:       output_uniforms,
		vertexShader:   SHADER.VertexPositionFromVector,
		fragmentShader: SHADER.FragmentColorFromPositionTexture,

		blending:       THREE.NormalBlending,
		depthTest:      false,
		transparent:    true

	});
	

	var output_geometry = new THREE.Geometry();
	for(var i = 0; i < Marbling_Settings.particleCountSQRT * Marbling_Settings.particleCountSQRT; ++i){
		output_geometry.vertices.push(new THREE.Vector3( i%Marbling_Settings.particleCountSQRT,  Math.floor(i/Marbling_Settings.particleCountSQRT), 0 ));
	}

	for(var i = 0; i < Marbling_Settings.particleCountSQRT * (Marbling_Settings.particleCountSQRT-1); ++i){
		if(i%Marbling_Settings.particleCountSQRT < Marbling_Settings.particleCountSQRT-1){

			output_geometry.faces.push(new THREE.Face3( i, i+Marbling_Settings.particleCountSQRT+1, i+Marbling_Settings.particleCountSQRT));
			output_geometry.faces.push(new THREE.Face3( i, i+1, i+Marbling_Settings.particleCountSQRT+1));

		}
	}

	var particleSystem = new THREE.Points( output_geometry, output_shaderMaterial );
	//var particleSystem = new THREE.Mesh( output_geometry, output_shaderMaterial );
	output_scene.add( particleSystem );

	var output_scene = new OutputScene(output_scene, output_camera);
	output_scene.setUpdateFunction(function(){
		output_uniforms.positionTexture.value = i_positionPass.getOutputTexture();
	});

	return output_scene;

}

function createTestOutputPass(i_testPass){


	var testOutput_pass = new OutputTextureRect(i_testPass.getOutputTexture(), {x:i_testPass.size.x, y:i_testPass.size.y});

	testOutput_pass.setUpdateFunction(function(){
		testOutput_pass.material.map = i_testPass.getOutputTexture();
	});

	return testOutput_pass;

}

function createImagePlanePass(i_texture, i_size){
	var imgOutput_pass = new OutputTextureRect(i_texture, {x:i_size.x, y:i_size.y});
	return imgOutput_pass;
}



function onDocumentMouseDown( event ) {

		event.preventDefault();

		if(Marbling_Settings.comb != null){
			for(var i = 0; i < (Marbling_Settings.velocityResolution*2)/Marbling_Settings.comb.space; ++i){
				Marbling_Globals.interactionPos[i] = null;
			}
		}else{
			Marbling_Globals.interactionPos[0] = null;
		}
}

function onDocumentMouseUp( event ) {
		event.preventDefault();
		
		if(Marbling_Settings.comb != null){
			for(var i = 0; i < (Marbling_Settings.velocityResolution*2)/Marbling_Settings.comb.space; ++i){
				Marbling_Globals.interactionPos[i] = undefined;
			}
		}else{
			Marbling_Globals.interactionPos[0] = undefined;
		}

		Marbling_Globals.velocityHBPass.clearWithFloatValues(0.5,0.5,0.5,1.0,Marbling_Globals.renderer);
		Marbling_Globals.velocityVBPass.clearWithFloatValues(0.5,0.5,0.5,1.0,Marbling_Globals.renderer);
}

function onDocumentMouseMove( event ) {
	
	var mP = getMousePos( Marbling_Globals.renderer.domElement, Marbling_Settings.velocityResolution, event );
	if(Marbling_Settings.comb != null){
		var cmbCnt = (Marbling_Settings.velocityResolution*2)/Marbling_Settings.comb.space;
		for(var i = 0; i < cmbCnt; ++i){
			var cP = {x:mP.x, y:mP.y};
			cP.x += Math.cos(Marbling_Settings.comb.angle)*((i*Marbling_Settings.comb.space)-(cmbCnt*Marbling_Settings.comb.space)/2.0);
			cP.y += Math.sin(Marbling_Settings.comb.angle)*((i*Marbling_Settings.comb.space)-(cmbCnt*Marbling_Settings.comb.space)/2.0);
			interactAt(cP, i);
		}
	}else{
		interactAt(mP, 0);
	}

}

function interactAt(i_position, i_index){

	if(Marbling_Globals.interactionPos[i_index] !== undefined){
		if(i_index < Marbling_Globals.interactionPos.length && Marbling_Globals.interactionPos[i_index] != null){
			event.preventDefault();
			var cMousePos = i_position;
			
			var vecX = ((cMousePos.x - Marbling_Globals.interactionPos[i_index].x) / (Marbling_Settings.velocityResolution));
			var vecY = ((cMousePos.y - Marbling_Globals.interactionPos[i_index].y) / (Marbling_Settings.velocityResolution));
			var vecOut = new THREE.Vector2(vecX, vecY);

			if(vecOut.length() > Marbling_Settings.lengthCutoff){
				vecOut.normalize();
			}else{
				vecOut.multiplyScalar(Marbling_Settings.tinyVecMult);
			}

			vecOut.x = (vecOut.x + 1)/2.0;
			vecOut.y = (vecOut.y + 1)/2.0;

			var s = new THREE.Scene();

			var cam = new THREE.OrthographicCamera(-Marbling_Settings.velocityResolution/2, Marbling_Settings.velocityResolution/2, -Marbling_Settings.velocityResolution/2, Marbling_Settings.velocityResolution/2, -1000, 1000);
			cam.position.z = 100;

			var uniforms = {
				RGVector: { type: "v2", value: vecOut}
			};

			var material = new THREE.ShaderMaterial({
				uniforms:       uniforms,
				vertexShader:   SHADER.VertexPassThrough,
				fragmentShader: SHADER.FragmentPassRGColorVector,

				blending:       THREE.NormalBlending,
				depthTest:      false,
				transparent:    false
			});

			var geometry = new THREE.Geometry();

			geometry.vertices.push(
				new THREE.Vector3(Marbling_Globals.interactionPos[i_index].x, Marbling_Globals.interactionPos[i_index].y, 1 ),
				new THREE.Vector3( cMousePos.x, cMousePos.y, 1 )
				//new THREE.Vector3( 1, 1, 0 )

			);

			var line = new THREE.Line( geometry, material );
			s.add( line );


			Marbling_Globals.renderer.autoClear = false;
			Marbling_Globals.renderer.render(s, cam, Marbling_Globals.velocityVBPass.getOutputTexture(), false);
			Marbling_Globals.renderer.autoClear = true;

			Marbling_Globals.interactionPos[i_index] = cMousePos;
		}else{

			var iDiff = i_index - Marbling_Globals.interactionPos.length;
			
			if(iDiff > 0){
				for(var i = 0; i < iDiff; ++i)
					Marbling_Globals.interactionPos.push(undefined);
			}

			Marbling_Globals.interactionPos[i_index] = i_position;
		}
	}

}

function getMousePos(canvas, bufferSize, evt) {
	var rect = canvas.getBoundingClientRect();
	
	var w = (rect.right - rect.left);
  	var h = (rect.bottom - rect.top);

	return {
  		x: ((evt.clientX - rect.left)/w)*bufferSize - bufferSize/2,
  		y: ((evt.clientY - rect.top)/h)*bufferSize - bufferSize/2
	};
	}

function onWindowResize() {

	//output_camera.aspect = window.innerWidth / window.innerHeight;
	//output_camera.updateProjectionMatrix();

	//renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

	requestAnimationFrame( animate );
	render();
	

	Marbling_Globals.stats.update();


}

function render() {
	Marbling_Globals.gpuCompute.render();
}