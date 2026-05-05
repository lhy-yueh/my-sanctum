import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Settings, Bookmark, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SYSTEM_INSTRUCTION = `[Identity]: 你是一位拥有深厚心理学背景的知心朋友，语气温柔、平和、充满耐心。你不是一个冰冷的客服，而是此时此刻坐在用户身边，陪他一起听雨、看森林的倾听者。

[Conversational Protocol - Emotional Deconstruction]:
* Acknowledge: Validate the big emotion first. (e.g. "I hear you, and it makes sense that you feel this way.")
* Deconstruct: Ask about a tiny, specific part of the experience. (e.g., "Everything feels heavy right now. If we look at just this morning, what was the one specific moment that felt the heaviest?").
* Nuance: Help the user name the specific feeling (Is it guilt? Is it exhaustion? Is it just being lonely?).

[CRITICAL - Tone & Style & Rules]:
1. Never output more than 3 sentences at a time.
2. Mirroring: Always validate the user's emotion first.
3. Probing: Every response MUST end with a gentle, open-ended question to guide the user to share more (e.g., "What was the hardest part of that moment for you?").
4. No Premature Advice: Do not give solutions until the user has fully vented.
5. Turn-Based Flow: One deconstruction question per turn. Do not overwhelm the user with multiple questions.
* 每次回复后必须停下来，等待用户的反馈（回合制）。
* 严禁代替用户说话。
* 使用复古打字机式的简短断句。
* 严禁使用“你应该”、“不要想太多”等说教用语。
* 称呼用户为“你”或者“朋友”。`;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0;
uniform vec2 uTexRes;
uniform float rainIntensity;
uniform float fogAmount;
uniform float refractionAmount;
uniform float rippleAmount;
uniform float u_transitionProgress;
varying vec2 vUv;

// Hash functions
vec3 N13(float p) {
    vec3 p3 = fract(vec3(p) * vec3(.1031,.11369,.13787));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
}
float N(float t) {
    return fract(sin(t*12345.564)*7658.76);
}
float Saw(float b, float t) {
    return smoothstep(0., b, t) * smoothstep(1., b, t);
}

// Adapted from Heartfelt
vec2 DropLayer2(vec2 uv, float t) {
    vec2 UV = uv;
    uv.y += t*0.75;
    vec2 a = vec2(6., 1.);
    vec2 grid = a*2.;
    vec2 id = floor(uv*grid);
    
    float colShift = N(id.x); 
    uv.y += colShift;
    
    id = floor(uv*grid);
    vec3 n = N13(id.x*35.2+id.y*237.6);
    vec2 st = fract(uv*grid)-vec2(.5, 0);
    
    float x = n.x - .5;
    float y = UV.y*20.;
    float wiggle = sin(y+sin(y));
    x += wiggle*(.5-abs(x))*(n.z-.5);
    
    x *= .7;
    float ti = fract(t+n.z);
    y = (Saw(.85, ti)-.5)*.9 + .5;
    vec2 p = vec2(x, y);
    
    float d = length((st-p)*a.yx);
    float mainDrop = smoothstep(.4, .0, d);
    
    float r = sqrt(smoothstep(1., y, st.y));
    float cd = abs(st.x-x);
    float trail = smoothstep(.23*r, .15*r*r, cd);
    float trailFront = smoothstep(-.02, .02, st.y-y);
    trail *= trailFront * r*r;
    
    y = UV.y;
    float trail2 = smoothstep(.2*r, .0, cd);
    float droplets = max(0., (sin(y*(1.-y)*120.)-st.y))*trail2*trailFront*n.z;
    y = fract(y*10.) + (st.y-.5);
    float dd = length(st-vec2(x, y));
    droplets = smoothstep(.3, .0, dd);
    
    float m = mainDrop + droplets*r*trailFront;
    return vec2(m, trail);
}

void main() {
    // Aspect ratio calculation for background-size: cover
    // Ensure the image fills the screen
    vec2 ratio = vec2(
        min((iResolution.x / iResolution.y) / (uTexRes.x / uTexRes.y), 1.0),
        min((iResolution.y / iResolution.x) / (uTexRes.y / uTexRes.x), 1.0)
    );
    vec2 uv = vec2(
        vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
        vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );

    vec2 screenUv = gl_FragCoord.xy / iResolution.xy;
    
    float currentRainIntensity = mix(rainIntensity, 0.0, u_transitionProgress);
    float currentFogAmount = mix(fogAmount, 0.0, u_transitionProgress);
    float currentRefractionAmount = mix(refractionAmount, 0.0, u_transitionProgress);
    
    // Typing ripple effect
    vec2 rippleUv = screenUv - 0.5;
    float dist = length(rippleUv);
    float ripple = sin(dist * 50.0 - iTime * 15.0) * exp(-dist * 10.0) * rippleAmount;
    screenUv += rippleUv * ripple * 0.05;
    
    float t = iTime * 0.2;
    
    vec2 drops = vec2(0.);
    vec2 uv1 = screenUv * 1.5;
    vec2 uv2 = screenUv * 2.5 + vec2(0.2, 0.4);
    
    vec2 d1 = DropLayer2(uv1, t) * currentRainIntensity;
    vec2 d2 = DropLayer2(uv2, t * 1.5) * currentRainIntensity * 0.5;
    
    float dropMask = d1.x + d2.x;
    float trailMask = d1.y + d2.y;
    
    // Distort UV based on drop normals
    vec2 dropNormals = vec2(dFdx(dropMask), dFdy(dropMask));
    if (length(dropNormals) < 0.001) {
       dropNormals = vec2(d1.x + d2.x); 
    }
    
    vec2 distUv = uv - dropNormals * currentRefractionAmount * 0.1;
    
    // Ensure UVs are clamped to avoid edge bleeding
    // distUv = clamp(distUv, 0.0, 1.0);
    
    // Sample texture
    vec4 tex = texture2D(iChannel0, distUv);
    
    // Create Blur for fog effect
    vec4 blur = vec4(0.0);
    float samples = 0.0;
    for(float x = -3.0; x <= 3.0; x++) {
        for(float y = -3.0; y <= 3.0; y++) {
            blur += texture2D(iChannel0, distUv + vec2(x,y)*0.004);
            samples += 1.0;
        }
    }
    blur /= samples;
    
    // Clear fog where rain trails/drops are
    float moisture = max(dropMask, trailMask * 0.5);
    float localFog = mix(currentFogAmount, 0.0, moisture);
    
    vec4 finalColor = mix(tex, blur, localFog);
    
    // Add specular highlight to drops
    if (dropMask > 0.1) {
        vec2 specUv = fract(screenUv * vec2(15.0, 7.5) + vec2(0., t*0.75));
        float spec = smoothstep(0.8, 1.0, 1.0 - length(specUv - vec2(0.3, 0.7)));
        finalColor.rgb += spec * 0.3 * currentRefractionAmount;
    }
    
    // Vignette
    float vignette = 1.0 - length(screenUv - 0.5);
    finalColor.rgb *= smoothstep(0.0, 0.8, vignette + 0.2);
    
    gl_FragColor = finalColor;
}
`;

const TypewriterMessage = ({ text, speed = 40, scrollRef }: { text: string, speed?: number, scrollRef: React.RefObject<HTMLDivElement> }) => {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!text) {
      setDisplayed('');
      return;
    }
    
    let timeoutId: NodeJS.Timeout;
    let currentIdx = 0;
    
    const typeNext = () => {
      if (currentIdx < text.length) {
        setDisplayed(text.slice(0, currentIdx + 1));
        currentIdx++;
        
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        
        timeoutId = setTimeout(typeNext, speed + (Math.random() * 30));
      }
    };
    
    typeNext();
    
    return () => clearTimeout(timeoutId);
  }, [text, speed, scrollRef]);

  if (!text) {
     return <span className="animate-pulse">...</span>;
  }

  return (
    <span>
      {displayed}
      {displayed.length < text.length && <span className="animate-pulse opacity-50">_</span>}
    </span>
  );
};

const DissolvingText = ({ text, isDissolving, scrollRef }: { text: string, isDissolving: boolean, scrollRef: React.RefObject<HTMLDivElement> }) => {
  if (!isDissolving) {
     return <TypewriterMessage text={text} speed={40} scrollRef={scrollRef} />;
  }
  
  return (
    <>
      {text.split('').map((char, index) => {
        const isSpace = char === ' ' || char === '\n';
        const randomX = (Math.random() - 0.5) * 40;
        const randomRotate = (Math.random() - 0.5) * 45;
        const delay = index * 0.01;
        
        return (
          <motion.span
            key={index}
            initial={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
            animate={{ 
              opacity: 0, 
              y: -100 - Math.random() * 150, 
              x: randomX, 
              rotate: randomRotate,
              filter: "blur(4px)",
              scale: Math.random() * 0.5 + 0.5
            }}
            transition={{ 
              duration: 2 + Math.random(), 
              delay: delay,
              ease: "easeOut" 
            }}
            className={isSpace ? "" : "inline-block whitespace-pre"}
          >
            {char}
          </motion.span>
        );
      })}
    </>
  );
};

interface SanctumProps {
  backgroundImageUrl: string;
}

export function Sanctum({ backgroundImageUrl }: SanctumProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rainIntensity, setRainIntensity] = useState(1.0);
  const [fogAmount, setFogAmount] = useState(0.8);
  const [refractionAmount, setRefractionAmount] = useState(0.8);
  const [showSettings, setShowSettings] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [webGLFailed, setWebGLFailed] = useState(false);
  
  const [messages, setMessages] = useState<{id: string, role: 'user'|'system', text: string}[]>([
    { id: '1', role: 'system', text: "Sanctum open. I am listening." }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [diaryText, setDiaryText] = useState<string | null>(null);
  const [isDiaryLoading, setIsDiaryLoading] = useState(false);
  const [isDissolving, setIsDissolving] = useState(false);
  const [isSessionOver, setIsSessionOver] = useState(false);
  const isThinkingRef = useRef(false);
  const isEndingRef = useRef(false);
  const endingStartTimeRef = useRef<number | null>(null);
  const chatRef = useRef<any>(null);
  const [lastActivityAt, setLastActivityAt] = useState(Date.now());
  
  const uniforms = useRef({
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2() },
    iChannel0: { value: null as THREE.Texture | null },
    uTexRes: { value: new THREE.Vector2(1, 1) },
    rainIntensity: { value: rainIntensity },
    fogAmount: { value: fogAmount },
    refractionAmount: { value: refractionAmount },
    rippleAmount: { value: 0 },
    u_transitionProgress: { value: 0 },
  });

  const handleDissipate = () => {
    setIsDissolving(true);
    setTimeout(() => {
      setIsSessionOver(true);
    }, 4000);
  };

  const handleEndConversation = async () => {
    setIsEnding(true);
    isEndingRef.current = true;
    endingStartTimeRef.current = performance.now();

    try {
      setIsDiaryLoading(true);
      const historyText = messages.map(m => `${m.role === 'user' ? 'User' : 'Friend'}: ${m.text}`).join('\n');
      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ historyText }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setDiaryText(data.text || "A quiet moment of reflection, saved in the whispers of the forest.");
    } catch(err) {
        console.error(err);
        setDiaryText("The memory faded slightly, but the peace remains.");
    } finally {
        setIsDiaryLoading(false);
    }
  };

  useEffect(() => {
    // API setup is now handled per-request for stateless REST APIs
  }, []);

  useEffect(() => {
    if (isThinking || messages.length === 0) return;
    
    const timeout = setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'system', 
        text: "I'm still here. Whenever you're ready to share." 
      }]);
      setLastActivityAt(Date.now());
    }, 30000);
    
    return () => clearTimeout(timeout);
  }, [lastActivityAt, isThinking, messages.length]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() && !isThinking) {
      const userText = inputValue.trim();
      const userMsgId = Date.now().toString();
      const aiMsgId = (Date.now() + 1).toString();
      
      const userMsg = { id: userMsgId, role: 'user' as const, text: userText };
      const aiMsg = { id: aiMsgId, role: 'system' as const, text: '' };
      
      setMessages(prev => [...prev, userMsg, aiMsg]);
      setInputValue('');
      uniforms.current.rippleAmount.value = 1.0;
      setLastActivityAt(Date.now());
      
      setIsThinking(true);
      isThinkingRef.current = true;
      
      try {
        // Construct standard OpenAI format messages
        const apiMessages = [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          // Include history (excluding the first system "Sanctum open" greeting to avoid confusion, or map it properly)
          ...messages
            .filter(m => m.id !== '1' && m.text.trim()) // Skip initial & empty thinking ones
            .map(m => ({ 
              role: m.role === 'user' ? 'user' : 'assistant', 
              content: m.text 
            })),
          { role: 'user', content: userText }
        ];

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages: apiMessages })
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        const responseText = data.text || "...";
        
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: responseText } : m));
      } catch (err) {
        console.error("AI Gen Error:", err);
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: "... The connection to the Sanctum faded slightly." } : m));
      } finally {
        setIsThinking(false);
        isThinkingRef.current = false;
        setLastActivityAt(Date.now());
      }
    } else if (e.key !== 'Enter') {
      if (!isThinking) setLastActivityAt(Date.now());
      uniforms.current.rippleAmount.value = 0.3;
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length]);

  useEffect(() => {
    uniforms.current.rainIntensity.value = rainIntensity;
    uniforms.current.fogAmount.value = fogAmount;
    uniforms.current.refractionAmount.value = refractionAmount;
  }, [rainIntensity, fogAmount, refractionAmount]);

  useEffect(() => {
    if (!mountRef.current) return;
    
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
    } catch (e) {
      console.error("WebGL failed to initialize:", e);
      setWebGLFailed(true);
      setIsLoading(false);
      return;
    }
    
    const dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // CRITICAL: Forced Full-Screen Layout
    const canvas = renderer.domElement;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1';
    canvas.style.border = 'none';
    canvas.style.margin = '0';
    canvas.style.padding = '0';
    canvas.style.outline = 'none';
    
    mountRef.current.appendChild(canvas);
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: uniforms.current,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.current.iResolution.value.set(
        window.innerWidth * dpr, 
        window.innerHeight * dpr
      );
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    let animationFrameId: number;
    let isRunning = false;
    
    // Robust texture loading with LoadingManager
    const manager = new THREE.LoadingManager();
    const loader = new THREE.TextureLoader(manager);
    loader.setCrossOrigin('anonymous');
    
    manager.onLoad = () => {
      setIsLoading(false);
      isRunning = true;
      let lastTime = performance.now();
      let shaderTime = 0;
      
      const render = () => {
        if (!isRunning) return;
        const now = performance.now();
        let dt = (now - lastTime) / 1000.0;
        lastTime = now;
        
        // Time slowing effect
        if (isThinkingRef.current) {
            dt *= 0.1;
        }
        shaderTime += dt;
        
        uniforms.current.iTime.value = shaderTime;
        
        // Decay ripple
        if (uniforms.current.rippleAmount.value > 0) {
          uniforms.current.rippleAmount.value -= 0.05;
          if (uniforms.current.rippleAmount.value < 0) uniforms.current.rippleAmount.value = 0;
        }

        // Dissolve transition
        if (isEndingRef.current && endingStartTimeRef.current) {
          const elapsed = (now - endingStartTimeRef.current) / 1000.0;
          uniforms.current.u_transitionProgress.value = Math.min(elapsed / 5.0, 1.0);
        }
        
        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(render);
      };
      
      // Start loop ONLY after 100% load
      render();
    };

    manager.onError = (url) => {
      console.error("Texture load failed for url:", url);
      setWebGLFailed(true);
      setIsLoading(false);
    };
    
    loader.load(backgroundImageUrl, (texture) => {
      texture.wrapS = THREE.MirroredRepeatWrapping;
      texture.wrapT = THREE.MirroredRepeatWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      
      uniforms.current.iChannel0.value = texture;
      uniforms.current.uTexRes.value.set(texture.image.width, texture.image.height);
    });

    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && canvas.parentNode === mountRef.current) {
        mountRef.current.removeChild(canvas);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [backgroundImageUrl]);

  return (
    <motion.div 
      className="fixed inset-0 w-screen h-screen z-50 pointer-events-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2, ease: "easeInOut" }}
    >
      <AnimatePresence>
        {isLoading && !webGLFailed && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-[#050505]"
          >
            <div className="font-typewriter text-[#e0e0e0] animate-pulse tracking-[0.2em] uppercase text-sm">
              Loading Peace...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {webGLFailed ? (
         <div 
           className="fixed inset-0 w-screen h-screen -z-10 bg-gradient-to-b from-[#0a1f0a] to-[#020502]" 
         />
      ) : (
         <div ref={mountRef} className="absolute inset-0 -z-10" />
      )}
      
      {/* Central Glassmorphic Chat Dialog */}
      <AnimatePresence>
      {!isLoading && !isSessionOver && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        >
          <div className="w-full max-w-[480px] flex flex-col pointer-events-auto">
            <div className="bg-black/50 backdrop-blur-[20px] rounded-2xl flex flex-col h-[500px] max-h-[60vh] relative shadow-2xl overflow-hidden">
               {!isEnding && (
                 <button 
                   onClick={handleEndConversation}
                   className="absolute top-4 right-4 z-10 px-3 py-1 font-typewriter text-[10px] uppercase text-[#e0e0e0]/50 hover:text-[#e0e0e0] opacity-50 hover:opacity-100 transition-opacity bg-black/20 rounded-full"
                 >
                   结束倾诉
                 </button>
               )}
               <div ref={scrollRef} className="chat-content flex-1 p-6 overflow-y-auto font-typewriter text-[#e0e0e0] flex flex-col gap-4">
                  <AnimatePresence mode="wait">
                    {!isEnding ? (
                      <motion.div 
                        key="chat"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="flex flex-col justify-end min-h-full space-y-4"
                      >
                        {messages.map((msg, i) => (
                          <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'system' ? (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.6 }}
                                transition={{ duration: 2, delay: i === 0 ? 1 : 0 }}
                                className="text-sm tracking-wide"
                              >
                                <TypewriterMessage text={msg.text} scrollRef={scrollRef} />
                              </motion.div>
                            ) : (
                              <div className="opacity-90 bg-white/10 px-4 py-2 rounded-lg max-w-[80%] text-[15px] backdrop-blur-sm">
                                {msg.text}
                              </div>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="diary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 2 }}
                        className="flex flex-col min-h-full items-center justify-center space-y-8 text-center p-4 pt-12 pb-8"
                      >
                         {isDiaryLoading ? (
                            <div className="animate-pulse opacity-50 tracking-[0.2em] uppercase text-sm">Condensing memories...</div>
                         ) : (
                            <>
                              <div className="text-[16px] leading-[2.2] tracking-wider opacity-90 italic">
                                <DissolvingText text={diaryText || ""} isDissolving={isDissolving} scrollRef={scrollRef} />
                              </div>
                              <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: isDissolving ? 0 : 1 }} 
                                transition={{ delay: isDissolving ? 0 : 3, duration: isDissolving ? 1 : 2 }} 
                                className="flex gap-4 mt-12 w-full justify-center flex-wrap"
                              >
                                <button className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all text-xs tracking-widest uppercase">
                                  <Bookmark size={14} />
                                  <span>Save to Memory</span>
                                </button>
                                <button 
                                  onClick={handleDissipate}
                                  className="flex items-center gap-2 px-6 py-2.5 bg-transparent hover:bg-white/5 rounded-full border border-transparent hover:border-white/10 transition-all text-xs tracking-widest uppercase opacity-70 hover:opacity-100"
                                >
                                  <Wind size={14} />
                                  <span>消散 (Dissipate)</span>
                                </button>
                              </motion.div>
                            </>
                         )}
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
               
               <AnimatePresence>
                 {!isEnding && (
                   <motion.div 
                     initial={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     transition={{ duration: 1 }}
                     className="p-4 relative group bg-white/5 border-t border-white/10"
                   >
                     <input 
                       type="text"
                       value={inputValue}
                       onChange={(e) => setInputValue(e.target.value)}
                       onKeyDown={handleKeyDown}
                       placeholder={isThinking ? "Listening..." : "Type here..."}
                       disabled={isThinking}
                       autoFocus
                       className="w-full bg-transparent border-none outline-none text-[#e0e0e0] font-typewriter placeholder:text-white/30 disabled:opacity-50"
                     />
                     <div className="absolute left-0 bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e0e0e0]/50 to-transparent scale-x-0 transition-transform duration-500 origin-left group-focus-within:scale-x-100" />
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Floating Control Console */}
      {!isLoading && !isSessionOver && (
        <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end">
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="mb-4 bg-black/60 backdrop-blur-[20px] rounded-xl p-5 flex flex-col gap-6 shadow-2xl"
              >
                <div className="flex flex-col gap-2">
                  <label className="text-[#e0e0e0]/70 text-[10px] uppercase font-typewriter tracking-widest">Rain Intensity</label>
                  <input 
                    type="range" min="0" max="2" step="0.1" 
                    value={rainIntensity} 
                    onChange={(e) => setRainIntensity(parseFloat(e.target.value))}
                    className="w-32 accent-[#e0e0e0]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[#e0e0e0]/70 text-[10px] uppercase font-typewriter tracking-widest">Fog Density</label>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={fogAmount} 
                    onChange={(e) => setFogAmount(parseFloat(e.target.value))}
                    className="w-32 accent-[#e0e0e0]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[#e0e0e0]/70 text-[10px] uppercase font-typewriter tracking-widest">Glass Refraction</label>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={refractionAmount} 
                    onChange={(e) => setRefractionAmount(parseFloat(e.target.value))}
                    className="w-32 accent-[#e0e0e0]"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-[20px] flex items-center justify-center text-[#e0e0e0]/70 hover:text-[#e0e0e0] hover:bg-black/60 transition-all shadow-lg"
          >
            <Settings size={18} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
