const HP="#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n";
const FLOW_FS=HP+`varying vec2 uv;uniform sampler2D A,B;uniform vec2 lp;
float L(sampler2D s,vec2 u){return dot(texture2D(s,u).rgb,vec3(.299,.587,.114));}
void main(){float best=1e9;vec2 bd=vec2(0.);
for(int dy=-4;dy<=4;dy++)for(int dx=-4;dx<=4;dx++){vec2 d=vec2(float(dx),float(dy));float c=0.;
for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 q=vec2(float(i),float(j))*lp;c+=abs(L(A,uv+q)-L(B,uv+q+d*lp));}
c+=dot(d,d)*.004;if(c<best){best=c;bd=d;}}
gl_FragColor=vec4(bd/8.+.5,0.,1.);}`;
const INT_FS=HP+`varying vec2 uv;uniform sampler2D A,B,F;uniform float t;uniform vec2 lp;
void main(){vec2 f=(texture2D(F,vec2(uv.x,1.-uv.y)).xy-.5)*8.*lp;
vec3 a=texture2D(A,uv-t*f).rgb,b=texture2D(B,uv+(1.-t)*f).rgb;
vec3 o=mix(a,b,t);float w=smoothstep(.12,.3,length(a-b));
vec3 n=t<.5?texture2D(A,uv).rgb:texture2D(B,uv).rgb;
gl_FragColor=vec4(mix(o,n,w*.8),1.);}`;

async function runFps(){
  if(busy||!file)return;const v=$("src"),cv=$("cv");
  if(!window.MediaRecorder||!v.requestVideoFrameCallback)return say("Нужен свежий Chrome или Safari (iOS 15.4 и новее).",true);
  const T=+$("fps").value;let W=v.videoWidth,H=v.videoHeight,tg=RES[$("resolution").value];
  if(tg){const p=H>W,bw=p?tg[1]:tg[0],bh=p?tg[0]:tg[1],s=Math.min(bw/W,bh/H);W=Math.round(W*s/2)*2;H=Math.round(H*s/2)*2}
  cv.width=W;cv.height=H;cv.hidden=false;
  const gl=cv.getContext("webgl",{preserveDrawingBuffer:true,antialias:false});
  if(!gl)return say("WebGL недоступен в этом браузере.",true);
  const mkp=f=>{const sh=(ty,s)=>{const h=gl.createShader(ty);gl.shaderSource(h,s);gl.compileShader(h);if(!gl.getShaderParameter(h,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(h));return h};
    const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);return p};
  let pf,pi;try{pf=mkp(FLOW_FS);pi=mkp(INT_FS)}catch(e){cv.hidden=true;return say("Ошибка шейдера: "+e.message,true)}
  gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  [pf,pi].forEach(p=>{gl.useProgram(p);const l=gl.getAttribLocation(p,"p");gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0)});
  const mkt=(u,w,h)=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D,t);
    [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]].forEach(([a,b])=>gl.texParameteri(gl.TEXTURE_2D,a,b));
    if(w)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);return t};
  const tx=[mkt(0),mkt(1)],LW=Math.max(8,Math.round(v.videoWidth/8)),LH=Math.max(8,Math.round(v.videoHeight/8));
  const ft=mkt(2,LW,LH),fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,ft,0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  const U=(p,n)=>gl.getUniformLocation(p,n);
  gl.useProgram(pf);gl.uniform1i(U(pf,"A"),0);gl.uniform1i(U(pf,"B"),1);gl.uniform2f(U(pf,"lp"),1/LW,1/LH);
  gl.useProgram(pi);gl.uniform1i(U(pi,"A"),0);gl.uniform1i(U(pi,"B"),1);gl.uniform1i(U(pi,"F"),2);gl.uniform2f(U(pi,"lp"),1/LW,1/LH);
  const uT=U(pi,"t"),up=(u,t)=>{gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D,t)},img=()=>gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,v);
  let nw=0,first=true,tNew=0,fd=1/30,lastMT=-1,stop=false;
  const render=()=>{if(stop)return;const t=Math.min(1,(performance.now()-tNew)/(fd*1000));
    gl.useProgram(pi);gl.uniform1f(uT,t);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    const p=Math.min(99,Math.round(v.currentTime/v.duration*100));setBar(p);say("Увеличение FPS: "+p+"%");requestAnimationFrame(render)};
  const onFrame=(_,md)=>{if(stop)return;
    if(first){[0,1].forEach(i=>{up(i,tx[i]);img()})}else{nw^=1;up(0,tx[nw]);img()}
    up(0,tx[nw^1]);up(1,tx[nw]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.viewport(0,0,LW,LH);gl.useProgram(pf);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);
    tNew=performance.now();if(lastMT>=0&&md.mediaTime>lastMT)fd=md.mediaTime-lastMT;lastMT=md.mediaTime;
    if(first){first=false;render()}v.requestVideoFrameCallback(onFrame)};

  const mime=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm"].find(t=>MediaRecorder.isTypeSupported(t))||"";
  const ext=mime.includes("mp4")?"mp4":"webm",stream=cv.captureStream(T);
  try{if(!window.AC){window.AC=new(window.AudioContext||window.webkitAudioContext)();window.DST=AC.createMediaStreamDestination();AC.createMediaElementSource(v).connect(DST)}
    await AC.resume();DST.stream.getAudioTracks().forEach(t=>stream.addTrack(t))}catch(_){}
  const rec=new MediaRecorder(stream,{mimeType:mime||undefined,videoBitsPerSecond:Math.round(W*H*T*BPP[$("quality").value]),audioBitsPerSecond:192000});
  const chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);const done=new Promise(r=>{rec.onstop=r});
  let wl=null;try{wl=await navigator.wakeLock.request("screen")}catch(_){}
  busy=true;cancelled=false;$("go").disabled=true;$("cancel").hidden=false;$("result").hidden=true;
  try{
    v.currentTime=0;v.muted=false;v.volume=1;rec.start(1000);await v.play();v.requestVideoFrameCallback(onFrame);
    await new Promise(r=>{const f=()=>{if(v.ended||cancelled)r();else setTimeout(f,300)};f()});
    await new Promise(r=>setTimeout(r,fd*1000+80));stop=true;v.pause();if(rec.state!=="inactive")rec.stop();await done;
    if(cancelled){say("Обработка отменена.");setBar(0)}else{
      const blob=new Blob(chunks,{type:mime||"video/webm"}),name=file.name.replace(/\.[^.]+$/,"")+"_"+T+"fps."+ext,url=URL.createObjectURL(blob);
      $("out").src=url;$("dl").href=url;$("dl").download=name;const f=new File([blob],name,{type:blob.type});
      $("share").hidden=!(navigator.canShare&&navigator.canShare({files:[f]}));$("share").onclick=()=>navigator.share({files:[f]}).catch(()=>{});
      setBar(100);say("Готово.");$("result").hidden=false;$("result").scrollIntoView({behavior:"smooth"})}
  }catch(e){stop=true;say("Ошибка обработки: "+(e.message||e),true);try{rec.stop()}catch(_){}}
  finally{stop=true;busy=false;$("go").disabled=false;$("cancel").hidden=true;cv.hidden=true;try{wl&&wl.release()}catch(_){}$("src").currentTime=0}
}

$("go").onclick=runFps;
