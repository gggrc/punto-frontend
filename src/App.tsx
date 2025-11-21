
// App.tsx - Update bagian API Configuration
import React, { useState, useEffect } from 'react';
import './App.css';

const Icon: React.FC<{ className: string }> = ({ className }) => {
    return <i className={className}></i>;
};

// === KONFIGURASI API YANG BENAR ===
// Gunakan environment variable untuk Railway URL
const API_BASE_URL = import.meta.env.VITE_APP_API_URL || 'http://127.0.0.1:5000';

// Fungsi helper untuk fetch dengan error handling yang lebih baik
const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
};

// Interfaces tetap sama seperti sebelumnya...
interface PyCell {
    value: number;
    player: number; 
}

interface PyPlayer {
    id: number;
    name: string;
    is_ai: boolean;
    color_id: number; 
    hand: number[];
    total_cards: number;
}

interface GameState {
    game_id: string;
    board: (PyCell | null)[][]; 
    currentPlayerId: number;
    winnerId: number | null;
    players: PyPlayer[];
    gameOver: boolean;
}

// Komponen Card, Board, PlayerArea tetap sama...
// (sisipkan kode komponen yang sudah ada)

const PuntoGame: React.FC = () => {
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'winner'>('menu');
    const [gameData, setGameData] = useState<GameState | null>(null);
    const [gameId, setGameId] = useState<string | null>(null);
    const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
    const [isThinking, setIsThinking] = useState<boolean>(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    
    const [numPlayersSelected, setNumPlayersSelected] = useState<number>(4);
    const [numAISelected, setNumAISelected] = useState<number>(3); 

    // === FUNGSI API YANG DIUPDATE ===
    
    const handleStartGame = async (numPlayers: number, numAI: number) => {
        setIsThinking(true);
        setConnectionError(null);
        setGameState('playing');
        
        try {
            const data = await fetchAPI('/start_game', {
                method: 'POST',
                body: JSON.stringify({ numPlayers, numAI }),
            });
            
            setGameId(data.game_id);
            setGameData(data);
            setSelectedCardIndex(null);
            
        } catch (error) {
            console.error("Gagal memulai game:", error);
            setConnectionError(
                `Tidak dapat terhubung ke server. 
                URL: ${API_BASE_URL}
                Error: ${error instanceof Error ? error.message : 'Unknown'}
                
                Pastikan:
                1. Backend Railway sudah di-deploy
                2. Environment variable VITE_APP_API_URL sudah diset
                3. CORS dikonfigurasi dengan benar`
            );
            setGameState('menu'); 
        } finally {
            setIsThinking(false);
        }
    };
    
    const handleCellClick = async (row: number, col: number) => {
        if (!gameData || gameData.gameOver || isThinking || selectedCardIndex === null) return;

        setIsThinking(true);
        
        try {
            const data = await fetchAPI('/make_move', {
                method: 'POST',
                body: JSON.stringify({
                    gameId: gameId,
                    cardIndex: selectedCardIndex,
                    row: row,
                    col: col,
                }),
            });

            setGameData(data);
            setSelectedCardIndex(null); 
            
        } catch (error) {
            alert(`Langkah tidak valid: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsThinking(false);
        }
    };

    const requestAIMove = async () => {
        if (!gameData || gameData.gameOver || isThinking) return;
        
        setIsThinking(true);

        try {
            const data = await fetchAPI('/ai_move', {
                method: 'POST',
                body: JSON.stringify({ gameId: gameId }),
            });
            
            setTimeout(() => {
                setGameData(data);
                setIsThinking(false);
            }, 500); 
            
        } catch (error) {
            console.error("Gagal meminta langkah AI:", error);
            setIsThinking(false);
        }
    };
    
    // Side effects tetap sama...
    useEffect(() => {
        if (gameData && !isThinking) {
            if (gameData.gameOver) {
                setGameState('winner');
            } else {
                const currentPlayer = gameData.players.find(p => p.id === gameData.currentPlayerId);
                if (currentPlayer?.is_ai) {
                    requestAIMove();
                }
            }
        }
    }, [gameData, isThinking]);

    // Render logic - tambahkan error display
    let screenContent;

    if (gameState === 'menu') {
        screenContent = (
            <div id="setupScreen" className="setup-screen">
                <h2>Pilih Konfigurasi Game</h2>
                
                {connectionError && (
                    <div style={{
                        background: '#e74c3c',
                        color: 'white',
                        padding: '15px',
                        margin: '20px 0',
                        fontSize: '0.4em',
                        lineHeight: '1.8',
                        whiteSpace: 'pre-wrap',
                        textAlign: 'left',
                        maxWidth: '600px'
                    }}>
                        {connectionError}
                    </div>
                )}
                
                <div className="player-count">
                    <button onClick={() => { setNumPlayersSelected(2); setNumAISelected(1); }}>2 Pemain (1 AI)</button>
                    <button onClick={() => { setNumPlayersSelected(3); setNumAISelected(2); }}>3 Pemain (2 AI)</button>
                    <button onClick={() => { setNumPlayersSelected(4); setNumAISelected(3); }}>4 Pemain (3 AI)</button>
                </div>
                
                <div className="info-box" style={{marginBottom: '20px', fontSize: '0.5em'}}>
                    Konfigurasi: {numPlayersSelected} Pemain Total, {numAISelected} AI
                </div>
                
                <button 
                    className="restart-btn" 
                    onClick={() => handleStartGame(numPlayersSelected, numAISelected)}
                >
                    <Icon className="fas fa-play" /> MULAI GAME
                </button>
                
                <p>
                    <Icon className="fas fa-server" /> Backend: {API_BASE_URL}
                </p>
            </div>
        );
    }
    // ... rest of render logic sama seperti sebelumnya
    
    return (
        <div className="game-container">
            {/* ... sama seperti sebelumnya */}
        </div>
    );
};

export default PuntoGame;