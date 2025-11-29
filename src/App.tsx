import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// --- Placeholder Icon ---
const Icon: React.FC<{ className: string }> = ({ className }) => {
    return <i className={className}></i>;
};

// --- Konfigurasi API ---
// Menggunakan import.meta.env untuk konfigurasi lokal, default ke '' untuk Vercel rewrite.
const API_BASE_URL = import.meta.env.VITE_APP_API_URL || ''; 

const colorClasses = ['color-red', 'color-green', 'color-blue', 'color-yellow'];

// --- Interfaces Frontend ---
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
            <div className={`card-on-board ${colorClasses[0] || ''} ${colorClass}`}>
                {value}
            </div>
        );
    }

    // type === 'hand'
    const classNames = `card ${colorClass || colorClasses[0]} ${isSelected ? 'selected' : ''}`;
    return (
        <div className={classNames} onClick={onClick}>
            {value}
        </div>
    );
};

// --- Komponen Player Area (Diperbarui) ---
interface PlayerAreaProps {
    player: PyPlayer;
    isActive: boolean;
    handContent: React.ReactNode;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, isActive, handContent }) => {
    const className = `player-area player-p${player.id + 1} ${isActive ? 'active' : ''}`;
    
    const playerColorClass = colorClasses[player.color_id];

    // Fungsi helper untuk mendapatkan Hex Color dari nama kelas
    const getHexColor = (className: string) => {
        switch (className) {
            case 'color-red': return '#e74c3c';
            case 'color-green': return '#2ecc71';
            case 'color-blue': return '#3498db';
            case 'color-yellow': return '#f1c40f';
            default: return '#3d5368'; // Warna default gelap
        }
    };
    
    const hexColor = getHexColor(playerColorClass);
    
    // Logika Border: Warna pemain jika AKTIF, Putih/Terang jika NON-AKTIF.
    const borderColor = isActive ? hexColor : '#ecf0f1'; 
    
    const activeStyle = isActive 
        ? { 
            borderColor: borderColor, 
            boxShadow: `0 0 15px ${hexColor}`,
            transform: 'scale(1.02)'
          } 
        : {
            borderColor: borderColor, 
            boxShadow: 'none',
            transform: 'none'
        };

    // Style inline untuk Player Info
    const playerInfoStyle = { 
        ...activeStyle 
    };

    return (
        <div className={className} id={`playerArea${player.id}`}>
            <div 
                className="player-info" 
                style={playerInfoStyle}
            >
                <div className="player-header">
                    <span className="player-name" style={{ color: hexColor }}>{player.name}</span>
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
        
        // 2. Jika sel kosong, harus bersebelahan (termasuk diagonal)
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
    
    // Default ke 4 pemain, 3 AI
    const [numPlayersSelected, setNumPlayersSelected] = useState<number>(4);
    const [numAISelected, setNumAISelected] = useState<number>(3); 

    // --- FUNGSI API ---

    const handleStartGame = async (numPlayers: number, numAI: number) => {
        // NOTE: UNTUK GAME NORMAL, backend (/start_game) bertanggung jawab untuk mengacak kartu.
        if (numAI >= numPlayers) {
            alert("Jumlah AI harus kurang dari total pemain.");
            return;
        }
        if (numPlayers < 2 || numPlayers > 4) {
            alert("Total pemain harus antara 2 hingga 4.");
            return;
        }

        setIsThinking(true);
        setGameState('playing');
        
        const endpoint = 'start_game';
        // Logic Vercel/Proxy: Jika API_BASE_URL kosong (di Vercel), gunakan path relatif (/)
        const fetchUrl = API_BASE_URL ? `${API_BASE_URL}/${endpoint}` : `/${endpoint}`;

        try {
            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numPlayers, numAI }),
            });
            
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
            alert(`Gagal terhubung ke backend API. Error: ${error}`);
            setGameState('menu'); 
        } finally {
            setIsThinking(false);
        }
    };
    
    const handleCellClick = async (row: number, col: number) => {
        if (!gameData || gameData.gameOver || isThinking || selectedCardIndex === null) return;

        // PERBAIKAN: Pemeriksaan defensif untuk gameId
        if (!gameId) {
             alert("Error: Game ID tidak ada. Silakan mulai ulang game.");
             setGameState('menu'); 
             return;
        }

        setIsThinking(true);
        const endpoint = 'make_move';
        // Logic Vercel/Proxy: Jika API_BASE_URL kosong (di Vercel), gunakan path relatif (/)
        const fetchUrl = API_BASE_URL ? `${API_BASE_URL}/${endpoint}` : `/${endpoint}`;
        
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

    const requestAIMove = useCallback(async () => {
        if (!gameData || gameData.gameOver || isThinking) return;
        
        // PERBAIKAN: Pemeriksaan defensif untuk gameId
        if (!gameId) {
             console.error("Game ID tidak ada saat giliran AI.");
             setGameState('menu'); 
             return;
        }

        setIsThinking(true);
        const endpoint = 'ai_move';
        // Logic Vercel/Proxy: Jika API_BASE_URL kosong (di Vercel), gunakan path relatif (/)
        const fetchUrl = API_BASE_URL ? `${API_BASE_URL}/${endpoint}` : `/${endpoint}`;

        try {
            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: gameId }),
            });
            
            if (!response.ok) throw new Error('AI move failed on server');
            
            const data: GameState = await response.json();
            
            setGameData(data);
            setIsThinking(false);
            
        } catch (error) {
            console.error("Gagal meminta langkah AI:", error);
            setIsThinking(false);
        }
    }, [gameData, gameId, isThinking]);
    
    // --- SIDE EFFECT (AI Turn & Game Over) ---
    useEffect(() => {
        if (gameData && !isThinking) {
            if (gameData.gameOver) {
                // Tidak perlu mengubah state, hanya menampilkan winner
            } else {
                const currentPlayer = gameData.players.find(p => p.id === gameData.currentPlayerId);
                // Hanya panggil AI jika giliran pemain saat ini adalah AI
                if (currentPlayer?.is_ai) {
                    // Karena AI sekarang sangat cepat (0.5s), panggilan akan segera kembali
                    requestAIMove();
                }
            }
        }
    }, [gameData, isThinking, requestAIMove]);

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
    
    // --- FUNGSI HANDLER UNTUK TOMBOL ---
    const updateNumPlayers = (change: number) => {
        setNumPlayersSelected(prev => {
            const newTotal = Math.min(4, Math.max(2, prev + change));
            // Batasi AI agar tidak melebihi newTotal - 1
            setNumAISelected(aiPrev => Math.min(newTotal - 1, aiPrev)); 
            return newTotal;
        });
    };

    const updateNumAI = (change: number) => {
        setNumAISelected(prev => {
            const newAI = Math.min(numPlayersSelected - 1, Math.max(1, prev + change));
            return newAI;
        });
    };
    // ---------------------------------
    
    const currentPlayer = gameData?.players.find(p => p.id === gameData?.currentPlayerId);
    const selectedCardValue = selectedCardIndex !== null && currentPlayer && currentPlayer.hand.length > selectedCardIndex ? currentPlayer.hand[selectedCardIndex] : null;
    
    // --- RENDER LOGIC ---
    
    const getWinnerMessage = () => {
        if (!gameData || !gameData.gameOver) return null;

        const winner = gameData.players.find(p => p.id === gameData.winnerId);
        
        if (winner) {
            const colorClass = colorClasses[winner.color_id];
            const winnerName = winner.name;
            return (
                <div 
                    className={`winner-message ${colorClass}`} 
                    onClick={handleRestart}
                >
                    <Icon className="fas fa-trophy" /> {winnerName.toUpperCase()} MENANG! (KLIK UNTUK MENU)
                </div>
            );
        } else if (gameData.gameOver) {
            return (
                <div 
                    className="winner-message color-text"
                    onClick={handleRestart}
                >
                    <Icon className="fas fa-handshake" /> PERMAINAN SERI! (KLIK UNTUK MENU)
                </div>
            );
        }
        return null;
    }

    let screenContent;

    if (gameState === 'menu') {
        
        const maxAI = numPlayersSelected - 1;

        // Komponen Kustom untuk Control +/-
        const ConfigControl: React.FC<{ label: string, value: number, onIncrement: () => void, onDecrement: () => void, minValue: number, maxValue: number, unit: string }> = ({ label, value, onIncrement, onDecrement, minValue, maxValue, unit }) => (
            <div className="config-group">
                <label>{label}</label>
                <div className="value-control">
                    <button 
                        onClick={onDecrement} 
                        disabled={value <= minValue}
                        className="control-btn"
                    >
                        -
                    </button>
                    {/* Menggabungkan nilai dan unit di dalam display */}
                    <div className="value-display">{value} {unit}</div>
                    <button 
                        onClick={onIncrement} 
                        disabled={value >= maxValue}
                        className="control-btn"
                    >
                        +
                    </button>
                </div>
            </div>
        );
        
        screenContent = (
            <div id="setupScreen" className="setup-screen">
                <h2>Pilih Konfigurasi Game</h2>
                
                <div className="player-config-controls">
                    
                    <ConfigControl
                        label="Total Pemain"
                        value={numPlayersSelected}
                        onIncrement={() => updateNumPlayers(1)}
                        onDecrement={() => updateNumPlayers(-1)}
                        minValue={2}
                        maxValue={4}
                        unit="Pemain"
                    />

                    <ConfigControl
                        label="Jumlah AI"
                        value={numAISelected}
                        onIncrement={() => updateNumAI(1)}
                        onDecrement={() => updateNumAI(-1)}
                        minValue={1}
                        maxValue={maxAI}
                        unit="AI"
                    />
                </div>
                
                <div className="info-box" style={{marginBottom: '20px', fontSize: '0.5em', marginTop: '10px'}}>
                    Konfigurasi Saat Ini: {numPlayersSelected} Pemain Total, {numAISelected} AI, {numPlayersSelected - numAISelected} Manusia
                </div>
                
                <button 
                    className="restart-btn" 
                    onClick={() => handleStartGame(numPlayersSelected, numAISelected)}
                >
                    <Icon className="fas fa-play" /> MULAI GAME
                </button>
                
                <p>
                    <Icon className="fas fa-info-circle" /> Semua logika ditenagai oleh Python API.
                    <br/>**Kartu diacak di backend (/start_game).**
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
            const playerColorClass = colorClasses[player.color_id]; 
            
            // Logika: Tampilkan kartu hanya jika gilirannya (karena backend hanya mengirimnya saat itu)
            if (player.hand && player.hand.length > 0) {
                 return player.hand.map((card_value, index) => (
                    <Card 
                        key={index} 
                        type="hand" 
                        value={card_value} 
                        colorClass={playerColorClass} 
                        // Kartu manusia aktif yang dipilih
                        isSelected={!player.is_ai && player.id === gameData.currentPlayerId && selectedCardIndex === index}
                        onClick={!player.is_ai && player.id === gameData.currentPlayerId ? () => handleCardSelect(index) : undefined}
                    />
                ));
            } else {
                // Sisa kartu disembunyikan
                const cardsHidden = player.total_cards;
                return Array(cardsHidden).fill(0).map((_, i) => <Card key={i} type="back" />);
            }
        };

        const topPlayer = playersByPosition.find(p => p.id === 0);
        const rightPlayer = playersByPosition.find(p => p.id === 1);
        const bottomPlayer = playersByPosition.find(p => p.id === 2);
        const leftPlayer = playersByPosition.find(p => p.id === 3);
        
        screenContent = (
            <div id="gameScreen">
                
                {/* Hapus rendering aiLogBox dan ai-thinking-overlay */}

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
                    {/* Tampilkan pesan pemenang/seri di sini */}
                    {getWinnerMessage()} 
                </div>
            </div>
            
            {screenContent}
        </div>
    );
};

export default PuntoGame;