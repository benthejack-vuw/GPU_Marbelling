/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 *
 * Two pass Gaussian blur filter (horizontal and vertical blur shaders)
 * - described in http://www.gamerendering.com/2008/10/11/gaussian-blur-filter-shader/
 *   and used in http://www.cake23.de/traveling-wavefronts-lit-up.html
 *
 * - 9 samples per pass
 * - standard deviation 2.7
 * - "h" and "v" parameters should be set to "1 / width" and "1 / height"
 */

THREE.HorizontalBlurShader = {

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform sampler2D computedOutput;",
		"uniform float amt;",

		"varying vec2 vUv;",

		"void main() {",

			"vec4 sum = vec4( 0.0 );",

			"sum += texture2D( computedOutput, vec2( vUv.x - 4.0 * amt, vUv.y ) ) * 0.051;",
			"sum += texture2D( computedOutput, vec2( vUv.x - 3.0 * amt, vUv.y ) ) * 0.0918;",
			"sum += texture2D( computedOutput, vec2( vUv.x - 2.0 * amt, vUv.y ) ) * 0.12245;",
			"sum += texture2D( computedOutput, vec2( vUv.x - 1.0 * amt, vUv.y ) ) * 0.1531;",
			"sum += texture2D( computedOutput, vec2( vUv.x, vUv.y ) ) * 0.1633;",
			"sum += texture2D( computedOutput, vec2( vUv.x + 1.0 * amt, vUv.y ) ) * 0.1531;",
			"sum += texture2D( computedOutput, vec2( vUv.x + 2.0 * amt, vUv.y ) ) * 0.12245;",
			"sum += texture2D( computedOutput, vec2( vUv.x + 3.0 * amt, vUv.y ) ) * 0.0918;",
			"sum += texture2D( computedOutput, vec2( vUv.x + 4.0 * amt, vUv.y ) ) * 0.051;",

			"gl_FragColor = sum;",

		"}"

	].join( "\n" )

};



/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 *
 * Two pass Gaussian blur filter (horizontal and vertical blur shaders)
 * - described in http://www.gamerendering.com/2008/10/11/gaussian-blur-filter-shader/
 *   and used in http://www.cake23.de/traveling-wavefronts-lit-up.html
 *
 * - 9 samples per pass
 * - standard deviation 2.7
 * - "h" and "v" parameters should be set to "1 / width" and "1 / height"
 */

THREE.VerticalBlurShader = {

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform sampler2D computedOutput;",
		"uniform float amt;",
		"uniform float velocityFalloff;",

		"varying vec2 vUv;",

		"void main() {",

			"vec4 sum = vec4( 0.0 );",

			"sum += texture2D( computedOutput, vec2( vUv.x, vUv.y - 4.0 * amt ) ) * 0.051;",
			"sum += texture2D( computedOutput, vec2( vUv.x, vUv.y - 3.0 * amt ) ) * 0.0918;",
			"sum += texture2D( computedOutput, vec2( vUv.x, vUv.y - 2.0 * amt ) ) * 0.12245;",
			"sum += texture2D( computedOutput, vec2( vUv.x, vUv.y - 1.0 * amt ) ) * 0.1531;",
			"sum += texture2D( computedOutput, vec2( vUv.x, vUv.y ) ) * 0.1633;",
			"sum += texture2D( computedOutput, vec2( vUv.x, vUv.y + 1.0 * amt ) ) * 0.1531;",
			"sum += texture2D( computedOutput, vec2( vUv.x, vUv.y + 2.0 * amt ) ) * 0.12245;",
			"sum += texture2D( computedOutput, vec2( vUv.x, vUv.y + 3.0 * amt ) ) * 0.0918;",
			"sum += texture2D( computedOutput, vec2( vUv.x, vUv.y + 4.0 * amt ) ) * 0.051;",

			"sum -= 0.5;",
			"sum *= velocityFalloff;",
			"sum += 0.5;",

			"gl_FragColor = sum;",

		"}"

	].join( "\n" )

};

SHADER = {};

SHADER.VertexPassThrough = [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" );


SHADER.FragmentPassRGColorVector = [

		"uniform vec2 RGVector;",

		"void main() {",

			"gl_FragColor = vec4(RGVector, 0.0, 1.0);",

		"}"

	].join( "\n" );


SHADER.FragmentClearWithFloats = [

		"uniform vec4 clearColor;",

		"void main() {",

			"gl_FragColor = clearColor;",

		"}"

	].join( "\n" );


SHADER.FragmentPositionIntegration = [

		"uniform float speed;",
		"uniform sampler2D computedOutput;",
		"uniform sampler2D velocities;",
		"varying vec2 vUv;",

		"void main() {",

			"vec2 pos = texture2D(computedOutput, vUv).xy;",
			"vec2 velocity = texture2D(velocities, pos).xy;",
			"velocity -= 0.5;",
			"pos += vec2(velocity.x, -velocity.y)*speed;",

			"gl_FragColor = vec4(pos, 0.0, 1.0);",

		"}"

	].join( "\n" );


SHADER.VertexPositionFromVector = [
		
		"uniform float particleSize;",
		"uniform vec2 viewSize;",
		"uniform vec2 textureSize;",
		"uniform sampler2D positionTexture;",

		"varying vec2 colorPos;",

		"void main() {",

			"vec2 pixelStep = vec2(1.0/textureSize.x, 1.0/textureSize.y);",
			"vec2 texOffset = vec2(pixelStep.x/2.0, pixelStep.y/2.0);",
			"vec4 texPosition = texture2D(positionTexture, position.xy*pixelStep.xy+texOffset.xy) * vec4(viewSize, 1.0, 1.0);",

			"vec4 mvPosition = modelViewMatrix * texPosition;",

			"gl_PointSize = particleSize;",
			"colorPos = position.xy*pixelStep.xy+texOffset.xy;",

			"gl_Position = projectionMatrix * mvPosition;",

		"}"

	].join("\n");

SHADER.FragmentColorFromPositionTexture = [

		"uniform vec2 viewSize;",
		"uniform sampler2D colorTexture;",
		"varying vec2 colorPos;",

		"void main() {",
			

			"float a = 0.7071 - distance(gl_PointCoord, vec2(0.5,0.5));",
			"gl_FragColor = vec4(texture2D(colorTexture, colorPos).rgb, a);",

		"}"

	].join("\n");
