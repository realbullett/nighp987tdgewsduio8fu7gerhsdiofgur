import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, Star, Shield, ChevronRight } from 'lucide-react';

const LOGO_URL = "https://media.discordapp.net/attachments/1453322194254954550/1463148133469913233/re.png?ex=6970c662&is=696f74e2&hm=d382eb4c31cf00871050d36e014ce27c69b489dd1aff09e0a7b23346a65189a7&=&format=webp&quality=lossless&width=450&height=450";

interface LoadingScreenProps {
    onComplete: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
    const [phase, setPhase] = useState(0);
    const [typedText, setTypedText] = useState('');
    const [cursorX, setCursorX] = useState(0);
    const [cursorY, setCursorY] = useState(0);
    const [isClicking, setIsClicking] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [hoveredResult, setHoveredResult] = useState(-1);
    const [fadeOut, setFadeOut] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [cursorVisible, setCursorVisible] = useState(true);
    const [searchBarFocused, setSearchBarFocused] = useState(false);
    const [searchButtonHovered, setSearchButtonHovered] = useState(false);

    const searchQuery = 'best free roblox external';
    const searchBarRef = useRef<HTMLDivElement>(null);
    const searchButtonRef = useRef<HTMLButtonElement>(null);
    const glyconRef = useRef<HTMLDivElement>(null);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Get element position relative to viewport
    const getElementPos = (el: HTMLElement | null) => {
        if (!el) return { x: 0, y: 0 };
        const rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
    };

    useEffect(() => {
        // Initialize cursor position
        setCursorX(window.innerWidth / 2);
        setCursorY(window.innerHeight / 3);

        const timeline = async () => {
            await delay(500);

            // Wait for refs to be available
            await delay(100);

            // Move cursor to search bar
            if (searchBarRef.current) {
                const pos = getElementPos(searchBarRef.current);
                setCursorX(pos.x);
                setCursorY(pos.y);
                await delay(600);
            }

            // Click on search bar
            setIsClicking(true);
            await delay(120);
            setIsClicking(false);
            setSearchBarFocused(true);
            await delay(300);

            // Start zoom in while typing
            setZoomLevel(1.3);
            await delay(400);

            // Phase 1: Start typing
            setPhase(1);
            for (let i = 0; i <= searchQuery.length; i++) {
                setTypedText(searchQuery.slice(0, i));
                await delay(35 + Math.random() * 35);
            }

            await delay(400);

            // Move cursor to search button
            if (searchButtonRef.current) {
                const pos = getElementPos(searchButtonRef.current);
                setCursorX(pos.x);
                setCursorY(pos.y);
                await delay(500);
            }

            // Hover search button
            setSearchButtonHovered(true);
            await delay(300);

            // Click search button
            setIsClicking(true);
            await delay(120);
            setIsClicking(false);

            await delay(200);

            // Phase 2: Show results and zoom out
            setPhase(2);
            setZoomLevel(1);
            setSearchButtonHovered(false);
            await delay(300);
            setShowResults(true);

            await delay(800);

            // Phase 3: Move cursor toward Glycon result
            setPhase(3);
            if (glyconRef.current) {
                const pos = getElementPos(glyconRef.current);
                setCursorX(pos.x - 80);
                setCursorY(pos.y);
                await delay(400);
                setCursorX(pos.x);
                setCursorY(pos.y);
                await delay(300);
            }

            // Hover effect
            setHoveredResult(0);
            await delay(500);

            // Phase 4: Click on Glycon
            setPhase(4);
            setIsClicking(true);
            await delay(150);
            setIsClicking(false);

            await delay(250);

            // Hide cursor and zoom into Glycon
            setCursorVisible(false);
            setZoomLevel(2.5);

            await delay(700);

            // Fade out and complete
            setFadeOut(true);
            await delay(500);
            onComplete();
        };

        timeline();
    }, [onComplete]);

    const searchResults = [
        {
            title: 'Glycon - Premium Roblox External',
            url: 'glycon.gg',
            description: 'The #1 undetected external solution for Roblox. Secure, fast, and premium.',
            isGlycon: true,
            stars: 5,
        },
        {
            title: 'RandomHack v2.0 - Free Tool',
            url: 'ratdownload.com',
            description: 'Another external tool for games with basic features...',
            isGlycon: false,
            stars: 2,
        },
        {
            title: 'Generic Exploit Hub',
            url: 'freerobux.net',
            description: 'Collection of various game tools and scripts...',
            isGlycon: false,
            stars: 1,
        },
    ];

    return (
        <div className={`fixed inset-0 z-[9999] bg-[#0a0a0a] transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
            {/* Main content with zoom */}
            <div
                className="h-full w-full flex flex-col"
                style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center 40%',
                    transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >

                {/* Browser Tab Bar */}
                <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center px-4 py-2.5 gap-3 flex-shrink-0">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#febc2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#28c840]"></div>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="bg-[#0f0f0f] rounded-lg px-4 py-2 flex items-center gap-2 min-w-[350px] max-w-[500px] border border-[#2a2a2a]">
                            <Globe size={14} className="text-gray-500" />
                            <span className="text-gray-400 text-sm font-mono">search.engine.com</span>
                        </div>
                    </div>
                    <div className="w-16"></div>
                </div>

                {/* Browser Content */}
                <div className="flex-1 bg-[#0f0f0f] overflow-hidden">

                    {/* Search Engine Interface */}
                    <div className="h-full flex flex-col items-center pt-12 px-4">

                        {/* Logo */}
                        <div className="mb-8 relative">
                            <div className="absolute inset-0 blur-xl opacity-30 bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500"></div>
                            <div className="relative text-5xl font-bold tracking-tight select-none">
                                <span className="text-blue-400">S</span>
                                <span className="text-red-400">e</span>
                                <span className="text-yellow-400">a</span>
                                <span className="text-blue-400">r</span>
                                <span className="text-green-400">c</span>
                                <span className="text-red-400">h</span>
                            </div>
                        </div>

                        {/* Search Bar Container */}
                        <div className="flex items-center gap-3 w-full max-w-xl">
                            {/* Search Input */}
                            <div
                                ref={searchBarRef}
                                className={`flex-1 bg-[#1a1a1a] border-2 ${searchBarFocused
                                    ? 'border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                                    : 'border-[#2a2a2a]'
                                    } rounded-full px-5 py-3.5 flex items-center gap-3 transition-all duration-300`}
                            >
                                <Search size={20} className={`transition-colors duration-300 ${searchBarFocused ? 'text-blue-400' : 'text-gray-500'}`} />
                                <div className="flex-1 text-white text-base font-sans min-h-[24px] flex items-center">
                                    <span>{typedText}</span>
                                    <span
                                        className={`inline-block w-0.5 h-5 bg-blue-400 ml-0.5 ${phase === 1 ? 'animate-cursor-blink' : 'opacity-0'
                                            }`}
                                    ></span>
                                </div>
                            </div>

                            {/* Search Button */}
                            <button
                                ref={searchButtonRef}
                                className={`px-6 py-3.5 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${searchButtonHovered
                                    ? 'bg-blue-500 text-white shadow-[0_0_25px_rgba(59,130,246,0.5)] scale-105'
                                    : 'bg-blue-600 text-white hover:bg-blue-500'
                                    }`}
                            >
                                <Search size={18} />
                                Search
                            </button>
                        </div>

                        {/* Search Results */}
                        {showResults && (
                            <div className="w-full max-w-xl mt-8 space-y-5">
                                <p className="text-gray-500 text-sm animate-fade-slide-in">
                                    About <span className="text-gray-400">1,337,420</span> results (0.42 seconds)
                                </p>

                                {searchResults.map((result, index) => (
                                    <div
                                        key={index}
                                        ref={index === 0 ? glyconRef : null}
                                        className={`group p-4 rounded-xl transition-all duration-300 animate-result-in ${hoveredResult === index
                                            ? result.isGlycon
                                                ? 'bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-purple-900/20 border-2 border-purple-500/50 scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.25)]'
                                                : 'bg-[#1a1a1a] border border-[#2a2a2a]'
                                            : result.isGlycon
                                                ? 'bg-[#1a1a1a]/50 border border-purple-500/20'
                                                : 'bg-transparent border border-transparent'
                                            }`}
                                        style={{
                                            animationDelay: `${index * 100}ms`,
                                            animationFillMode: 'backwards'
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            {result.isGlycon ? (
                                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg transition-all duration-300 ${hoveredResult === 0 ? 'shadow-purple-500/50 scale-110' : 'shadow-purple-500/30'
                                                    }`}>
                                                    <img src={LOGO_URL} alt="Glycon" className="w-7 h-7 object-contain" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-[#252525] flex items-center justify-center flex-shrink-0">
                                                    <Globe size={18} className="text-gray-500" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
                                                    <span className="font-mono">{result.url}</span>
                                                    {result.isGlycon && (
                                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30">
                                                            <Shield size={10} className="text-green-400" />
                                                            <span className="text-green-400 text-[10px] font-semibold">Verified</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <h3 className={`font-semibold mb-1.5 flex items-center gap-2 flex-wrap transition-colors duration-300 ${result.isGlycon
                                                    ? hoveredResult === 0 ? 'text-purple-200' : 'text-purple-300'
                                                    : 'text-blue-400'
                                                    }`}>
                                                    {result.title}
                                                    {result.isGlycon && (
                                                        <span className={`text-[10px] bg-gradient-to-r from-purple-500 to-indigo-500 px-2.5 py-1 rounded-full text-white font-bold uppercase tracking-wider shadow-lg transition-all duration-300 ${hoveredResult === 0 ? 'shadow-purple-500/50 scale-105' : 'shadow-purple-500/20'
                                                            }`}>
                                                            #1 BEST
                                                        </span>
                                                    )}
                                                </h3>
                                                <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{result.description}</p>
                                                {result.isGlycon && (
                                                    <div className="flex items-center gap-1.5 mt-2.5">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                size={13}
                                                                className={`text-yellow-400 fill-yellow-400 transition-all duration-300 ${hoveredResult === 0 ? 'drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]' : ''
                                                                    }`}
                                                            />
                                                        ))}
                                                        <span className="text-xs text-gray-500 ml-1.5">(15.2k reviews)</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`transition-all duration-300 ${hoveredResult === index ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                                                <ChevronRight
                                                    size={22}
                                                    className={`${result.isGlycon ? 'text-purple-400' : 'text-gray-500'} animate-pulse-arrow`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Animated Cursor - Outside the zoomed container */}
            {cursorVisible && (
                <div
                    className="fixed pointer-events-none z-[10000]"
                    style={{
                        left: cursorX,
                        top: cursorY,
                        transition: 'left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                >
                    <div
                        style={{
                            transform: isClicking ? 'scale(0.85) rotate(-8deg)' : 'scale(1) rotate(0deg)',
                            transition: 'transform 0.1s ease-out',
                        }}
                    >
                        {/* Cursor SVG */}
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                        >
                            <path
                                d="M5.5 3.21V20.8a.5.5 0 00.85.36l4.29-4.29a.5.5 0 01.36-.15h6.5a.5.5 0 00.35-.85L6.35 3.06a.5.5 0 00-.85.15z"
                                fill="white"
                                stroke="black"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            />
                        </svg>

                        {/* Click ripple effect */}
                        {isClicking && (
                            <div className="absolute top-1 left-1">
                                <div className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 bg-purple-500/40 rounded-full animate-click-ripple"></div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Styles */}
            <style>{`
        @keyframes cursor-blink {
          0%, 45% { opacity: 1; }
          50%, 95% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-cursor-blink {
          animation: cursor-blink 1s ease-in-out infinite;
        }
        
        @keyframes fade-slide-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-slide-in {
          animation: fade-slide-in 0.4s ease-out forwards;
        }
        
        @keyframes result-in {
          from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.97); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        .animate-result-in {
          animation: result-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        @keyframes pulse-arrow {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        .animate-pulse-arrow {
          animation: pulse-arrow 0.8s ease-in-out infinite;
        }
        
        @keyframes click-ripple {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        .animate-click-ripple {
          animation: click-ripple 0.4s ease-out forwards;
        }
      `}</style>
        </div>
    );
};

export default LoadingScreen;
