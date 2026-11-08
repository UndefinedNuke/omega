const SL=[["denoise","Шумоподавление",0,100,15,v=>v+"%"],["sharpen","Резкость",0,100,35,v=>v+"%"],["brightness","Яркость",-50,50,0,v=>(v>0?"+":"")+v],["contrast","Контраст",50,150,105,v=>v+"%"],["saturation","Насыщенность",0,200,105,v=>v+"%"]];
const PRESETS={"Сбалансированное":[15,35,0,105,105],"Шумное видео":[55,25,0,105,100],"Мягкое / размытое":[10,70,0,110,105],"Более насыщенные цвета":[10,25,0,112,125]};
SL.forEach(([id,t,mn,mx,v,f])=>{const d=document.createElement("div");d.className="sl";
  d.innerHTML=`<div><label for="${id}">${t}</label><output id="o_${id}">${f(v)}</output></div><input type="range" id="${id}" min="${mn}" max="${mx}" value="${v}">`;
  $("sliders").append(d);$(id).oninput=()=>$("o_"+id).textContent=f(+$(id).value)});
$("preset").onchange=()=>PRESETS[$("preset").value].forEach((v,i)=>{const s=SL[i];$(s[0]).value=v;$("o_"+s[0]).textContent=s[5](v)});
const FS=`precision mediump float;varying vec2 uv;uniform sampler2D t,pv;uniform vec2 px;uniform float dn,sh,br,ct,sa,tm;
vec3 S(float x,float y){return texture2D(t,uv+vec2(x,y)*px).rgb;}
void main(){vec3 c=S(0.,0.);vec3 acc=c,bl=c;float ws=1.,wb=1.;float sg=mix(.02,.2,dn);
for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){if(i==0&&j==0)continue;vec3 s=S(float(i),float(j));vec3 d=s-c;
float w=exp(-dot(d,d)/(sg*sg))*dn;acc+=s*w;ws+=w;bl+=s;wb+=1.;}
vec3 r=acc/ws;bl/=wb;
vec3 p=texture2D(pv,uv).rgb;vec3 e=p-r;float k=tm*dn*exp(-dot(e,e)/(sg*sg*4.))*.6;r=mix(r,p,k);
r+=sh*(r-bl);
r=(r-.5)*ct+.5+br;float l=dot(r,vec3(.299,.587,.114));r=mix(vec3(l),r,sa);
gl_FragColor=vec4(clamp(r,0.,1.),1.);}`;
$("go").onclick=async()=>{
  if(busy||!file)return;
  if(!window.MediaRecorder){return say("Этот браузер не умеет записывать видео. Открой сайт в Chrome или Safari.",true)}
  const v=$("src"),cv=$("cv");
  const o=Object.fromEntries(SL.map(s=>[s[0],+$(s[0]).value]));
  let W=v.videoWidth,H=v.videoHeight,tg=RES[$("resolution").value];
  if(tg){const portrait=H>W,bw=portrait?tg[1]:tg[0],bh=portrait?tg[0]:tg[1],sc=Math.min(bw/W,bh/H);W=Math.round(W*sc/2)*2;H=Math.round(H*sc/2)*2}
  cv.width=W;cv.height=H;cv.hidden=false;
  const gl=cv.getContext("webgl",{preserveDrawingBuffer:true,antialias:false});
  if(!gl)return say("WebGL недоступен в этом браузере.",true);
  const sh=(ty,src)=>{const s=gl.createShader(ty);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
  const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
  const bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,"p");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const mk=u=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D,t);
    [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]].forEach(([a,b])=>gl.texParameteri(gl.TEXTURE_2D,a,b));return t};
  mk(0);mk(1);
  const U=n=>gl.getUniformLocation(pr,n);
  gl.uniform1i(U("t"),0);gl.uniform1i(U("pv"),1);gl.uniform2f(U("px"),1/v.videoWidth,1/v.videoHeight);
  gl.uniform1f(U("dn"),o.denoise/100);gl.uniform1f(U("sh"),o.sharpen/100*2);gl.uniform1f(U("br"),o.brightness/500);
  gl.uniform1f(U("ct"),o.contrast/100);gl.uniform1f(U("sa"),o.saturation/100);gl.viewport(0,0,W,H);
  let first=true;
  const draw=()=>{gl.activeTexture(gl.TEXTURE0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,v);
    gl.uniform1f(U("tm"),first?0:1);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.activeTexture(gl.TEXTURE1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv);first=false};

  const types=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm"];
  const mime=types.find(t=>MediaRecorder.isTypeSupported(t))||"";
  const ext=mime.includes("mp4")?"mp4":"webm";
  const stream=cv.captureStream(30);
  try{if(!window.AC){window.AC=new(window.AudioContext||window.webkitAudioContext)();
      window.DST=AC.createMediaStreamDestination();AC.createMediaElementSource(v).connect(DST)}
    await AC.resume();DST.stream.getAudioTracks().forEach(t=>stream.addTrack(t))}catch(_){}
  const rec=new MediaRecorder(stream,{mimeType:mime||undefined,videoBitsPerSecond:Math.round(W*H*30*BPP[$("quality").value]),audioBitsPerSecond:192000});
  const chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  let wl=null;try{wl=await navigator.wakeLock.request("screen")}catch(_){}

  busy=true;cancelled=false;$("go").disabled=true;$("cancel").hidden=false;$("result").hidden=true;
  const done=new Promise(res=>{rec.onstop=res});
  const tick=()=>{if(v.ended||cancelled)return;draw();
    const p=Math.min(99,Math.round(v.currentTime/v.duration*100));setBar(p);say("Улучшение видео: "+p+"%");
    v.requestVideoFrameCallback?v.requestVideoFrameCallback(tick):requestAnimationFrame(tick)};
  try{
    v.currentTime=0;v.muted=false;v.volume=1;
    rec.start(1000);await v.play();tick();
    await new Promise(r=>{const f=()=>{if(v.ended||cancelled)r();else setTimeout(f,300)};f()});
    v.pause();if(rec.state!=="inactive")rec.stop();await done;
    if(cancelled){say("Обработка отменена.");setBar(0)}
    else{const blob=new Blob(chunks,{type:mime||"video/webm"});const name=file.name.replace(/\.[^.]+$/,"")+"_enhanced."+ext;
      const url=URL.createObjectURL(blob);$("out").src=url;$("dl").href=url;$("dl").download=name;
      const f=new File([blob],name,{type:blob.type});
      $("share").hidden=!(navigator.canShare&&navigator.canShare({files:[f]}));
      $("share").onclick=()=>navigator.share({files:[f]}).catch(()=>{});
      setBar(100);say("Улучшение завершено.");$("result").hidden=false;$("result").scrollIntoView({behavior:"smooth"})}
  }catch(e){say("Ошибка обработки: "+(e.message||e),true);try{rec.stop()}catch(_){}}
  finally{busy=false;$("go").disabled=false;$("cancel").hidden=true;cv.hidden=true;try{wl&&wl.release()}catch(_){}
    $("src").currentTime=0}
};
