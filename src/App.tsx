import React, { useState, useEffect } from 'react';
import './App.css';

// --- Placeholder Icon ---
const Icon: React.FC<{ className: string }> = ({ className }) => {
    return <i className={className}></i>;
};

// --- Konfigurasi API ---
const API_URL = '/'; 
const API_BASE_URL = import.meta.env.VITE_APP_API_URL || 'http://127.0.0.1:5000';

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

// --- Komponen Hand (Deck Pemain) ---
interface HandProps {
    cards: number[];
    colorClass: string;
    selectedIndex: number | null;
    onCardSelect: (index: number) => void;
    canSelectCards: boolean;
}

const Hand: React.FC<HandProps> = ({ cards, colorClass, selectedIndex, onCardSelect, canSelectCards }) => {
    return (
        <div className="hand">
            {cards.map((card_value, index) => (
                <Card 
                    key={`card-${index}`}
                    type="hand" 
                    value={card_value} 
                    colorClass={colorClass} 
                    isSelected={selectedIndex === index}
                    onClick={() => canSelectCards && onCardSelect(index)}
                />
            ))}
        </div>
    );
};

// --- Komponen Hidden Hand (Kartu Lawan/AI) ---
interface HiddenHandProps {
    cardCount: number;
}

const HiddenHand: React.FC<HiddenHandProps> = ({ cardCount }) => {
    return (
        <div className="hand">
            {Array(cardCount).fill(0).map((_, i) => (
                <Card key={`hidden-card-${i}`} type="back" />
            ))}
        </div>
    );
};

// --- Komponen Player Area ---
interface PlayerAreaProps {
    player: PyPlayer;
    isActive: boolean;
    selectedCardIndex: number | null;
    onCardSelect: (index: number) => void;
    canSelectCards: boolean;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ 
    player, 
    isActive, 
    selectedCardIndex, 
    onCardSelect, 
    canSelectCards 
}) => {
    const className = `player-area player-p${player.id + 1} ${isActive ? 'active' : ''}`;
    const cardColor = colorClasses[player.color_id];

    return (
        <div className={className} id={`playerArea${player.id}`}>
            <div className="player-info" style={{ borderColor: cardColor }}>
                <div className="player-header">
                    <span className="player-name" style={{ color: cardColor }}>
                        {player.name}
                    </span>
                    <span className="cards-left">{player.total_cards} Kartu</span>
                </div>
                
                {/* Render hand berdasarkan apakah bisa select atau tidak */}
                {canSelectCards && player.id !== undefined ? (
                    <Hand 
                        cards={player.hand}
                        colorClass={cardColor}
                        selectedIndex={selectedCardIndex}
                        onCardSelect={onCardSelect}
                        canSelectCards={canSelectCards}
                    />
                ) : (
                    <HiddenHand cardCount={player.total_cards} />
                )}
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
    
    const getIsClickable = (row: number, col: number, cell: PyCell | null, isFirstMove: boolean) => {
        if (selectedCardValue === null) return false;
        
        const isCenter = row === 4 && col === 4;
        const isEmpty = cell === null;
        
        if (isFirstMove) {
            return isCenter;
        }
        
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

// --- Komponen Utama Game Punto ---
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
        const fetchUrl = API_URL === '/' ? `/${endpoint}` : `${API_BASE_URL}/${endpoint}`;

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

        if (!gameId) {
             alert("Error: Game ID tidak ada. Silakan mulai ulang game.");
             setGameState('menu'); 
             return;
        }

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
        
        if (!gameId) {
             console.error("Game ID tidak ada saat giliran AI.");
             setGameState('menu'); 
             return;
        }

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
        const currentPlayer = gameData?.players.find(p => p.id === gameData?.currentPlayerId);
        if (currentPlayer && !currentPlayer.is_ai) {
             setSelectedCardIndex(index);
        }
    }
    
    const updateNumPlayers = (change: number) => {
        setNumPlayersSelected(prev => {
            const newTotal = Math.min(4, Math.max(2, prev + change));
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
    
    const currentPlayer = gameData?.players.find(p => p.id === gameData?.currentPlayerId);
    const currentPlayerHand = (currentPlayer && !currentPlayer.is_ai) ? currentPlayer.hand : [];
    const selectedCardValue = selectedCardIndex !== null ? currentPlayerHand[selectedCardIndex] : null;

    // --- RENDER LOGIC ---
    let screenContent;

    if (gameState === 'menu') {
        
        const maxAI = numPlayersSelected - 1;

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
                </p>
            </div>
        );
        
    } else if (gameState === 'playing' && gameData) {
        
        const playersByPosition = [
            gameData.players.find(p => p.id === 0),
            gameData.players.find(p => p.id === 1),
            gameData.players.find(p => p.id === 2),
            gameData.players.find(p => p.id === 3),
        ].filter(p => p !== undefined) as PyPlayer[];
        
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
                    {topPlayer && (
                        <PlayerArea 
                            player={topPlayer} 
                            isActive={topPlayer.id === gameData.currentPlayerId}
                            selectedCardIndex={topPlayer.id === gameData.currentPlayerId ? selectedCardIndex : null}
                            onCardSelect={handleCardSelect}
                            canSelectCards={topPlayer.id === gameData.currentPlayerId && !topPlayer.is_ai}
                        />
                    )}
                    
                    {leftPlayer && (
                        <PlayerArea 
                            player={leftPlayer} 
                            isActive={leftPlayer.id === gameData.currentPlayerId}
                            selectedCardIndex={leftPlayer.id === gameData.currentPlayerId ? selectedCardIndex : null}
                            onCardSelect={handleCardSelect}
                            canSelectCards={leftPlayer.id === gameData.currentPlayerId && !leftPlayer.is_ai}
                        />
                    )}
                    
                    <Board 
                        boardState={gameData.board}
                        currentPlayerId={gameData.currentPlayerId}
                        selectedCardValue={selectedCardValue}
                        handleCellClick={handleCellClick}
                    />
                    
                    {rightPlayer && (
                        <PlayerArea 
                            player={rightPlayer} 
                            isActive={rightPlayer.id === gameData.currentPlayerId}
                            selectedCardIndex={rightPlayer.id === gameData.currentPlayerId ? selectedCardIndex : null}
                            onCardSelect={handleCardSelect}
                            canSelectCards={rightPlayer.id === gameData.currentPlayerId && !rightPlayer.is_ai}
                        />
                    )}
                    
                    {bottomPlayer && (
                        <PlayerArea 
                            player={bottomPlayer} 
                            isActive={bottomPlayer.id === gameData.currentPlayerId}
                            selectedCardIndex={bottomPlayer.id === gameData.currentPlayerId ? selectedCardIndex : null}
                            onCardSelect={handleCardSelect}
                            canSelectCards={bottomPlayer.id === gameData.currentPlayerId && !bottomPlayer.is_ai}
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

    return (
        <div className="game-container">
            <div className="top-bar-container">
                <div className="header-info-group">
                    <h1><Icon className="fas fa-bullseye" /> PUNTO</h1>
                </div>
            </div>
            
            {screenContent}
        </div>
    );
};

export default PuntoGame;