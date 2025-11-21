import React, { useState, useEffect } from 'react';
import './App.css';

// --- Placeholder Icon ---
const Icon: React.FC<{ className: string }> = ({ className }) => {
    return <i className={className}></i>;
};

// --- Konfigurasi API (FINAL: Menggunakan Root Path) ---
// Frontend hanya tahu path "/" saat development (via proxy) atau production (via Vercel Rewrites)
// Catatan: Root path ('/') digunakan untuk memanggil endpoint: /start_game, /make_move, dll.
const API_URL = '/'; 
// URL Fallback Lokal dipertahankan 
const API_BASE_URL = import.meta.env.VITE_APP_API_URL || 'http://127.0.0.1:5000';


const colorClasses = ['color-red', 'color-green', 'color-blue', 'color-yellow'];

// --- Interfaces Frontend (Mencerminkan Output JSON dari Python) ---
interface PyCell {
    value: number;
    player: number; 
}

interface PyPlayer {
    id: number;
    name: string;
    is_ai: boolean;
    color_id: number; 
    hand: number[]; // Hanya nilai kartu untuk pemain aktif
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

// --- Komponen Kartu ---
interface CardProps {
    value?: number;
    colorClass?: string;
    type: 'hand' | 'board' | 'back';
    isSelected?: boolean;
    onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ value, colorClass, type, isSelected = false, onClick }) => {
    if (type === 'back') {
        return <div className="card-back"></div>;
    }

    if (type === 'board') {
        return (
            <div className={`card-on-board ${colorClass}`}>
                {value}
            </div>
        );
    }

    // type === 'hand'
    const classNames = `card ${colorClasses[0] || ''} ${isSelected ? 'selected' : ''}`;
    return (
        <div className={classNames} onClick={onClick}>
            {value}
        </div>
    );
};

// --- Komponen Player Area ---
interface PlayerAreaProps {
    player: PyPlayer;
    isActive: boolean;
    handContent: React.ReactNode;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, isActive, handContent }) => {
    const className = `player-area player-p${player.id + 1} ${isActive ? 'active' : ''}`;
    const cardColor = colorClasses[player.color_id];

    return (
        <div className={className} id={`playerArea${player.id}`}>
            <div className="player-info" style={{ borderColor: cardColor }}>
                <div className="player-header">
                    <span className="player-name" style={{ color: cardColor }}>{player.name}</span>
                    <span className="cards-left">{player.total_cards} Kartu</span>
                </div>
                <div className="hand">
                    {handContent}
                </div>
            </div>
        </div>
    );
};

// --- Komponen Papan (Board) ---
interface BoardProps {
    boardState: (PyCell | null)[][];
    currentPlayerId: number;
    selectedCardValue: number | null;
    handleCellClick: (row: number, col: number) => void;
}

const Board: React.FC<BoardProps> = ({ boardState, currentPlayerId, selectedCardValue, handleCellClick }) => {
    const boardSize = 9;
    const cells = [];
    
    // Logika penanda visual untuk langkah valid (perkiraan di frontend)
    const getIsClickable = (row: number, col: number, cell: PyCell | null, isFirstMove: boolean) => {
        if (selectedCardValue === null) return false;
        
        const isCenter = row === 4 && col === 4;
        const isEmpty = cell === null;
        
        // 1. Jika langkah pertama, harus di tengah
        if (isFirstMove) {
            return isCenter;
        }
        
        // 2. Jika sel kosong, harus bersebelahan
        if (isEmpty) {
            const directions = [
                [-1, 0], [1, 0], [0, -1], [0, 1], 
                [-1, -1], [-1, 1], [1, -1], [1, 1]
            ];
            for (const [dr, dc] of directions) {
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9 && boardState[nr][nc] !== null) {
                    return true;
                }
            }
            return false;
        } 
        
        // 3. Jika menumpuk, harus kartu lawan dan nilai lebih tinggi
        return cell!.player !== currentPlayerId && selectedCardValue! > cell!.value;
    };
    
    const isBoardEmpty = boardState.flat().every(c => c === null);

    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const cell = boardState[row][col];
            
            const isClickable = getIsClickable(row, col, cell, isBoardEmpty);
            
            let cellClassName = 'cell';
            if (isClickable) {
                cellClassName += ' valid-move';
            }
            
            cells.push(
                <div 
                    key={`${row}-${col}`} 
                    className={cellClassName} 
                    onClick={() => isClickable && handleCellClick(row, col)}
                >
                    {cell ? <Card type="board" value={cell.value} colorClass={colorClasses[cell.player]} /> : null}
                </div>
            );
        }
    }

    return (
        <div className="board-container">
            <div id="board" className="board">
                {cells}
            </div>
        </div>
    );
};


// --- Komponen Utama Game Punto (Frontend Controller) ---
const PuntoGame: React.FC = () => {
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'winner'>('menu');
    const [gameData, setGameData] = useState<GameState | null>(null);
    const [gameId, setGameId] = useState<string | null>(null);
    const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
    const [isThinking, setIsThinking] = useState<boolean>(false);
    
    const [numPlayersSelected, setNumPlayersSelected] = useState<number>(4);
    const [numAISelected, setNumAISelected] = useState<number>(3); 

    // --- FUNGSI API ---

    const handleStartGame = async (numPlayers: number, numAI: number) => {
        setIsThinking(true);
        setGameState('playing');
        
        const endpoint = 'start_game';
        // Menggunakan fetchUrl = '/start_game' (jika deployed) atau 'http://127.0.0.1:5000/start_game' (jika lokal)
        const fetchUrl = API_URL === '/' ? `/${endpoint}` : `${API_BASE_URL}/${endpoint}`;

        try {
            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numPlayers, numAI }),
            });
            
            // Periksa status 404 (Not Found) secara eksplisit untuk debugging
            if (response.status === 404) {
                 throw new Error(`Endpoint not found. Check Vercel Rewrite/Proxy configuration. Tried URL: ${fetchUrl}`);
            }

            if (!response.ok) throw new Error('Failed to start game on server');
            
            const data: GameState = await response.json();
            
            setGameId(data.game_id);
            setGameData(data);
            setSelectedCardIndex(null);
            
        } catch (error) {
            console.error("Gagal memulai game:", error);
            // Memberikan instruksi troubleshooting yang lebih jelas
            alert(`Gagal terhubung ke backend API. Pastikan: 
1. Backend Railway sudah di-deploy dan berjalan.
2. Konfigurasi Vercel Rewrite/Proxy ke Railway sudah benar.
3. Error: ${error}`);
            setGameState('menu'); 
        } finally {
            setIsThinking(false);
        }
    };
    
    const handleCellClick = async (row: number, col: number) => {
        if (!gameData || gameData.gameOver || isThinking || selectedCardIndex === null) return;

        setIsThinking(true);
        const endpoint = 'make_move';
        const fetchUrl = API_URL === '/' ? `/${endpoint}` : `${API_BASE_URL}/${endpoint}`;
        
        try {
            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: gameId,
                    cardIndex: selectedCardIndex,
                    row: row,
                    col: col,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(`Langkah tidak valid: ${errorData.error}`);
                setIsThinking(false);
                return;
            }

            const data: GameState = await response.json();
            setGameData(data);
            setSelectedCardIndex(null); 
            
        } catch (error) {
            console.error("Gagal melakukan langkah:", error);
            alert("Terjadi kesalahan saat langkah. Cek server Python.");
        } finally {
            setIsThinking(false);
        }
    };

    const requestAIMove = async () => {
        if (!gameData || gameData.gameOver || isThinking) return;
        
        setIsThinking(true);
        const endpoint = 'ai_move';
        const fetchUrl = API_URL === '/' ? `/${endpoint}` : `${API_BASE_URL}/${endpoint}`;

        try {
            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: gameId }),
            });
            
            if (!response.ok) throw new Error('AI move failed on server');
            
            const data: GameState = await response.json();
            
            // Tambahkan delay kecil untuk efek "berpikir}
            setTimeout(() => {
                setGameData(data);
                setIsThinking(false);
            }, 500); 
            
        } catch (error) {
            console.error("Gagal meminta langkah AI:", error);
            setIsThinking(false);
        }
    };
    
    // --- SIDE EFFECT (AI Turn & Game Over) ---
    useEffect(() => {
        if (gameData && !isThinking) {
            if (gameData.gameOver) {
                setGameState('winner');
            } else {
                const currentPlayer = gameData.players.find(p => p.id === gameData.currentPlayerId);
                // Hanya panggil AI jika giliran pemain saat ini adalah AI
                if (currentPlayer?.is_ai) {
                    requestAIMove();
                }
            }
        }
    }, [gameData, isThinking]);

    const handleRestart = () => {
        setGameState('menu'); 
        setGameData(null);
        setGameId(null);
    };

    const handleCardSelect = (index: number) => {
        // Cek apakah pemain saat ini adalah manusia sebelum memilih kartu
        const currentPlayer = gameData?.players.find(p => p.id === gameData?.currentPlayerId);
        if (currentPlayer && !currentPlayer.is_ai) {
             setSelectedCardIndex(index);
        }
    }
    
    const currentPlayer = gameData?.players.find(p => p.id === gameData?.currentPlayerId);
    const currentPlayerHand = (currentPlayer && !currentPlayer.is_ai) ? currentPlayer.hand : [];
    const selectedCardValue = selectedCardIndex !== null ? currentPlayerHand[selectedCardIndex] : null;

    // --- RENDER LOGIC ---
    let screenContent;

    if (gameState === 'menu') {
        screenContent = (
            <div id="setupScreen" className="setup-screen">
                <h2>Pilih Konfigurasi Game</h2>
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
                    <Icon className="fas fa-info-circle" /> Semua logika ditenagai oleh Python API.
                </p>
            </div>
        );
    } else if (gameState === 'playing' && gameData) {
        
        const playersByPosition = [
            gameData.players.find(p => p.id === 0), // P1 - Atas
            gameData.players.find(p => p.id === 1), // P2 - Kanan
            gameData.players.find(p => p.id === 2), // P3 - Bawah
            gameData.players.find(p => p.id === 3), // P4 - Kiri
        ].filter(p => p !== undefined) as PyPlayer[];
        
        const renderHand = (player: PyPlayer) => {
            if (player.id === gameData.currentPlayerId && !player.is_ai) {
                // Tampilkan kartu jika giliran pemain manusia
                return player.hand.map((card_value, index) => (
                    <Card 
                        key={index} 
                        type="hand" 
                        value={card_value} 
                        colorClass={colorClasses[player.color_id]}
                        isSelected={selectedCardIndex === index}
                        onClick={() => handleCardSelect(index)}
                    />
                ));
            } else {
                // Tampilkan kartu belakang untuk pemain lain atau AI
                return Array(player.total_cards).fill(0).map((_, i) => <Card key={i} type="back" />);
            }
        };

        const topPlayer = playersByPosition.find(p => p.id === 0);
        const rightPlayer = playersByPosition.find(p => p.id === 1);
        const bottomPlayer = playersByPosition.find(p => p.id === 2);
        const leftPlayer = playersByPosition.find(p => p.id === 3);

        screenContent = (
            <div id="gameScreen">
                <div id="aiThinking" className="ai-thinking" style={{ display: isThinking && currentPlayer?.is_ai ? 'block' : 'none' }}>
                    <Icon className="fas fa-robot" /> AI sedang berpikir...
                </div>

                <div className="game-layout">
                    {/* P1 - Atas */}
                    {topPlayer && (
                        <PlayerArea 
                            player={topPlayer} 
                            isActive={topPlayer.id === gameData.currentPlayerId}
                            handContent={renderHand(topPlayer)}
                        />
                    )}
                    
                    {/* P4 - Kiri */}
                    {leftPlayer && (
                        <PlayerArea 
                            player={leftPlayer} 
                            isActive={leftPlayer.id === gameData.currentPlayerId}
                            handContent={renderHand(leftPlayer)}
                        />
                    )}
                    
                    <Board 
                        boardState={gameData.board}
                        currentPlayerId={gameData.currentPlayerId}
                        selectedCardValue={selectedCardValue}
                        handleCellClick={handleCellClick}
                    />
                    
                    {/* P2 - Kanan */}
                    {rightPlayer && (
                        <PlayerArea 
                            player={rightPlayer} 
                            isActive={rightPlayer.id === gameData.currentPlayerId}
                            handContent={renderHand(rightPlayer)}
                        />
                    )}
                    
                    {/* P3 - Bawah */}
                    {bottomPlayer && (
                        <PlayerArea 
                            player={bottomPlayer} 
                            isActive={bottomPlayer.id === gameData.currentPlayerId}
                            handContent={renderHand(bottomPlayer)}
                        />
                    )}
                </div>
            </div>
        );
    } else if (gameState === 'winner' && gameData) { 
        const winner = gameData.players.find(p => p.id === gameData.winnerId);
        const winnerName = winner ? winner.name : 'Permainan Seri';

        screenContent = (
            <div id="winnerScreen" className="winner-screen">
                <h2><Icon className="fas fa-trophy" /> {gameData.winnerId !== null ? 'SELAMAT!' : 'PERMAINAN SERI'} <Icon className="fas fa-trophy" /></h2>
                <div className="winner-info" id="winnerInfo" style={{color: winner ? colorClasses[winner.color_id] : 'white'}}>
                    {winnerName} telah memenangkan permainan!
                </div>
                <button className="restart-btn" onClick={handleRestart}><Icon className="fas fa-redo" /> Main Lagi</button>
            </div>
        );
    } else {
        screenContent = (
             <div className="setup-screen">
                <div className="info-box">Loading...</div>
            </div>
        )
    }

    // --- Render Komponen Utama ---
    return (
        <div className="game-container">
            <div className="top-bar-container">
                <div className="header-info-group">
                    <h1><Icon className="fas fa-bullseye" /> PUNTO</h1>
                    <div id="gameInfo" className="game-info">
                        <div className="info-box">
                            Giliran: <span id="currentPlayer" style={{color: currentPlayer ? colorClasses[currentPlayer.color_id] : 'white'}}>{currentPlayer?.name || 'Pilih Pemain'}</span>
                        </div>
                        <div className="info-box">
                            Kartu: <span id="selectedCard">{selectedCardValue !== null ? selectedCardValue : '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {screenContent}
        </div>
    );
};

export default PuntoGame;