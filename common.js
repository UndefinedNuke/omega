const $=id=>document.getElementById(id);
const RES={"Исходное":null,"720p":[1280,720],"1080p":[1920,1080],"1440p":[2560,1440],"4K":[3840,2160]};
const BPP={"Максимальное качество":.16,"Высокое качество":.11,"Баланс":.075,"Меньший размер":.05};
const setBar=p=>$("bar").style.width=p+"%";
const say=(t,e)=>{$("status").textContent=t;$("status").className=e?"err":""};

const VS=`attribute vec2 p;varying vec2 uv;void main(){gl_Position=vec4(p,0.,1.);uv=vec2(p.x*.5+.5,.5-p.y*.5);}`;

let file=null,cancelled=false,busy=false;
$("file").onchange=()=>{file=$("file").files[0];if(!file)return;
  const v=$("src");v.src=URL.createObjectURL(file);v.onloadedmetadata=()=>{
    $("pickT").textContent=file.name;
    $("pickI").textContent=v.videoWidth+"×"+v.videoHeight+", "+Math.floor(v.duration/60)+":"+String(Math.round(v.duration%60)).padStart(2,"0");
    say("Видео выбрано. Настрой параметры и нажми «Улучшить видео».");$("go").disabled=false;$("result").hidden=true;setBar(0)};
  v.onerror=()=>say("Не удалось открыть видео. Попробуй MP4 или MOV.",true)};

$("cancel").onclick=()=>{cancelled=true};
