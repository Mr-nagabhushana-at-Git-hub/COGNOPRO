import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Target, Play, RotateCcw, Trophy, Activity, Grid } from "lucide-react";

interface SpatialMemoryProps {
  onGameEnd: () => void;
}

interface GameState {
  level: number;
  score: number;
  lives: number;
  gridSize: number; // e.g., 3 means 3x3
  activeTiles: number[]; // The tiles the user needs to remember
  selectedTiles: number[]; // The tiles the user has clicked
  gameStatus: 'waiting' | 'memorize' | 'recall' | 'success' | 'failure' | 'gameover';
}

const INITIAL_LIVES = 3;

export default function SpatialRecallMatrix({ onGameEnd }: SpatialMemoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    lives: INITIAL_LIVES,
    gridSize: 3,
    activeTiles: [],
    selectedTiles: [],
    gameStatus: 'waiting',
  });
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);

  const saveScoreMutation = useMutation({
    mutationFn: async (scoreData: any) => {
      return await apiRequest('POST', '/api/brain-games/scores', scoreData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brain-games/scores"] });
    }
  });

  const generateLevel = (level: number) => {
    let size = 3;
    if (level > 3) size = 4;
    if (level > 7) size = 5;
    if (level > 12) size = 6;

    const numTilesToRemember = Math.min(Math.floor(size * size * 0.4) + Math.floor(level / 2), size * size - 1);
    const tiles = new Set<number>();
    
    while (tiles.size < numTilesToRemember) {
      tiles.add(Math.floor(Math.random() * (size * size)));
    }

    return { size, activeTiles: Array.from(tiles) };
  };

  const startGame = () => {
    startLevel(1, 0, INITIAL_LIVES);
    setGameStartTime(new Date());
  };

  const startLevel = (level: number, currentScore: number, lives: number) => {
    const { size, activeTiles } = generateLevel(level);
    
    setGameState({
      level,
      score: currentScore,
      lives,
      gridSize: size,
      activeTiles,
      selectedTiles: [],
      gameStatus: 'memorize',
    });

    // Time to memorize decreases slightly as levels go up, but base is around 2.5s
    const memorizeTime = Math.max(1000, 3000 - (level * 100));
    setTimeLeft(Math.ceil(memorizeTime / 1000));

    setTimeout(() => {
      setGameState(prev => ({ ...prev, gameStatus: 'recall' }));
      // Time to recall
      setTimeLeft(10 + Math.floor(activeTiles.length * 0.5));
    }, memorizeTime);
  };

  const handleTileClick = (index: number) => {
    if (gameState.gameStatus !== 'recall') return;
    if (gameState.selectedTiles.includes(index)) return;

    const newSelected = [...gameState.selectedTiles, index];
    
    // Check if the clicked tile is WRONG
    if (!gameState.activeTiles.includes(index)) {
      handleFailure();
      return;
    }

    // Check if the user has found ALL tiles
    if (newSelected.length === gameState.activeTiles.length) {
      handleSuccess(newSelected);
      return;
    }

    // Otherwise, just update selected tiles
    setGameState(prev => ({ ...prev, selectedTiles: newSelected }));
  };

  const handleSuccess = (finalSelected: number[]) => {
    const levelBonus = gameState.level * 100;
    const timeBonus = timeLeft * 10;
    const newScore = gameState.score + levelBonus + timeBonus;

    setGameState(prev => ({
      ...prev,
      selectedTiles: finalSelected,
      gameStatus: 'success',
      score: newScore
    }));

    setTimeout(() => {
      startLevel(gameState.level + 1, newScore, gameState.lives);
    }, 1500);
  };

  const handleFailure = () => {
    const newLives = gameState.lives - 1;
    
    if (newLives <= 0) {
      setGameState(prev => ({ ...prev, gameStatus: 'gameover', lives: 0 }));
      endGame();
    } else {
      setGameState(prev => ({ ...prev, gameStatus: 'failure', lives: newLives }));
      setTimeout(() => {
        startLevel(gameState.level, gameState.score, newLives);
      }, 2000);
    }
  };

  const endGame = async () => {
    if (gameStartTime) {
      const duration = Math.floor((new Date().getTime() - gameStartTime.getTime()) / 1000);
      try {
        await saveScoreMutation.mutateAsync({
          gameType: 'logic', // keeping 'logic' as the DB type to not break schema
          score: gameState.score,
          level: gameState.level,
          duration: duration
        });
      } catch (e) {
        console.warn("Could not save score", e);
      }
    }
  };

  // Timer countdown
  useEffect(() => {
    if ((gameState.gameStatus === 'memorize' || gameState.gameStatus === 'recall') && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState.gameStatus === 'recall' && timeLeft === 0) {
      handleFailure();
    }
  }, [gameState.gameStatus, timeLeft]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* HUD Header */}
      <Card className="glass-card border-[hsla(245,82%,63%,0.2)] bg-[hsla(225,20%,10%,0.6)]">
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[hsl(245,82%,63%)] to-[hsl(280,72%,58%)] rounded-xl flex items-center justify-center shadow-[0_0_20px_hsla(245,82%,63%,0.4)]">
                <Grid className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-white tracking-tight">Spatial Recall Matrix</CardTitle>
                <p className="text-sm text-[hsl(245,82%,75%)] font-mono uppercase tracking-widest">
                  Neural Pattern Harmonization
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={onGameEnd} className="border-white/10 hover:bg-white/5 text-white">
              Abort Protocol
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Telemetry Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              {gameState.score}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Score</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-[hsla(245,82%,63%,0.2)]">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-[hsl(245,82%,63%)] drop-shadow-[0_0_10px_hsla(245,82%,63%,0.5)]">
              {gameState.level}
            </p>
            <p className="text-xs text-[hsl(245,82%,75%)] uppercase tracking-widest mt-1">Matrix Level</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-[hsla(350,100%,60%,0.2)]">
          <CardContent className="p-4 text-center flex flex-col items-center">
            <div className="flex space-x-1 mb-1 h-9 items-center">
              {Array.from({ length: INITIAL_LIVES }, (_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: i < gameState.lives ? 1 : 0.5,
                    opacity: i < gameState.lives ? 1 : 0.2
                  }}
                  className={`w-4 h-4 rounded-full ${i < gameState.lives ? 'bg-[hsl(350,100%,60%)] shadow-[0_0_10px_hsl(350,100%,60%)]' : 'bg-white/20'}`}
                />
              ))}
            </div>
            <p className="text-xs text-[hsl(350,100%,75%)] uppercase tracking-widest mt-1">Integrity</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-[hsla(165,80%,48%,0.2)]">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-[hsl(165,80%,48%)] drop-shadow-[0_0_10px_hsla(165,80%,48%,0.5)]">
              {gameState.gameStatus === 'waiting' || gameState.gameStatus === 'gameover' ? '--' : `${timeLeft}s`}
            </p>
            <p className="text-xs text-[hsl(165,80%,75%)] uppercase tracking-widest mt-1">Time Loop</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Game Arena */}
      <Card className="glass-card border-white/10 relative overflow-hidden min-h-[500px] flex flex-col items-center justify-center p-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[hsl(245,82%,63%)] opacity-[0.02] rounded-full blur-[100px] pointer-events-none" />

        <AnimatePresence mode="wait">
          {gameState.gameStatus === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center z-10"
            >
              <div className="w-24 h-24 rounded-full border border-[hsla(245,82%,63%,0.5)] flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-2 border-2 border-dashed border-[hsla(245,82%,63%,0.3)] rounded-full animate-[spin_10s_linear_infinite]" />
                <Activity className="h-10 w-10 text-[hsl(245,82%,63%)]" />
              </div>
              <h3 className="text-3xl font-black text-white mb-4 tracking-tight">System Ready</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
                Memorize the illuminated quantum nodes. When the matrix resets, recreate the exact pattern before the time loop collapses.
              </p>
              <Button
                size="lg"
                onClick={startGame}
                className="h-14 px-10 text-lg bg-[hsl(245,82%,63%)] hover:bg-[hsl(245,82%,53%)] text-white shadow-[0_0_30px_hsla(245,82%,63%,0.4)] rounded-full"
              >
                <Play className="mr-3 h-5 w-5 fill-current" /> Initiate Protocol
              </Button>
            </motion.div>
          )}

          {(gameState.gameStatus === 'memorize' || gameState.gameStatus === 'recall' || gameState.gameStatus === 'success' || gameState.gameStatus === 'failure') && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center z-10 w-full"
            >
              {/* HUD Status Text */}
              <div className="h-12 mb-6">
                <AnimatePresence mode="wait">
                  {gameState.gameStatus === 'memorize' && (
                    <motion.div key="mem" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <Badge className="text-lg py-2 px-6 bg-[hsla(245,82%,63%,0.2)] text-[hsl(245,82%,75%)] border border-[hsl(245,82%,63%)] animate-pulse shadow-[0_0_20px_hsla(245,82%,63%,0.3)]">
                        MEMORIZE PATTERN
                      </Badge>
                    </motion.div>
                  )}
                  {gameState.gameStatus === 'recall' && (
                    <motion.div key="rec" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <Badge className="text-lg py-2 px-6 bg-emerald-500/20 text-emerald-400 border border-emerald-500 shadow-[0_0_20px_hsla(165,80%,48%,0.3)]">
                        RECONSTRUCT MATRIX ({gameState.selectedTiles.length}/{gameState.activeTiles.length})
                      </Badge>
                    </motion.div>
                  )}
                  {gameState.gameStatus === 'success' && (
                    <motion.div key="suc" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                      <Badge className="text-lg py-2 px-6 bg-emerald-500/30 text-emerald-300 border border-emerald-400 shadow-[0_0_30px_hsla(165,80%,48%,0.5)]">
                        SYNCHRONIZATION COMPLETE
                      </Badge>
                    </motion.div>
                  )}
                  {gameState.gameStatus === 'failure' && (
                    <motion.div key="fail" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                      <Badge className="text-lg py-2 px-6 bg-[hsla(350,100%,60%,0.2)] text-[hsl(350,100%,70%)] border border-[hsl(350,100%,60%)] shadow-[0_0_30px_hsla(350,100%,60%,0.5)]">
                        SYSTEM COLLAPSE - INTEGRITY LOST
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Grid */}
              <div 
                className="grid gap-3 sm:gap-4 w-full max-w-[500px] aspect-square mx-auto p-4 sm:p-6 bg-[hsla(225,20%,5%,0.6)] rounded-3xl border border-white/5 backdrop-blur-xl shadow-2xl"
                style={{ gridTemplateColumns: `repeat(${gameState.gridSize}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: gameState.gridSize * gameState.gridSize }, (_, index) => {
                  const isActive = gameState.activeTiles.includes(index);
                  const isSelected = gameState.selectedTiles.includes(index);
                  
                  let tileStateClass = "bg-[hsla(225,20%,15%,0.5)] border-white/5 hover:bg-[hsla(225,20%,25%,0.8)]";
                  let tileGlow = "";

                  if (gameState.gameStatus === 'memorize') {
                    if (isActive) {
                      tileStateClass = "bg-[hsl(245,82%,63%)] border-[hsl(245,82%,75%)]";
                      tileGlow = "shadow-[0_0_30px_hsla(245,82%,63%,0.6)]";
                    }
                  } else if (gameState.gameStatus === 'recall') {
                    if (isSelected) {
                      tileStateClass = "bg-[hsl(165,80%,48%)] border-[hsl(165,80%,60%)]";
                      tileGlow = "shadow-[0_0_20px_hsla(165,80%,48%,0.5)]";
                    }
                  } else if (gameState.gameStatus === 'success') {
                    if (isActive) {
                      tileStateClass = "bg-[hsl(165,80%,48%)] border-[hsl(165,80%,60%)]";
                      tileGlow = "shadow-[0_0_30px_hsla(165,80%,48%,0.8)] animate-pulse";
                    }
                  } else if (gameState.gameStatus === 'failure') {
                    if (isSelected && !isActive) {
                      tileStateClass = "bg-[hsl(350,100%,60%)] border-[hsl(350,100%,70%)]";
                      tileGlow = "shadow-[0_0_30px_hsla(350,100%,60%,0.8)]";
                    } else if (isActive) {
                      tileStateClass = "bg-[hsl(245,82%,63%)] border-[hsl(245,82%,75%)] opacity-50";
                    }
                  }

                  return (
                    <motion.button
                      key={index}
                      initial={false}
                      animate={{ scale: isSelected ? 0.95 : 1 }}
                      whileHover={{ scale: gameState.gameStatus === 'recall' && !isSelected ? 1.05 : 1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleTileClick(index)}
                      disabled={gameState.gameStatus !== 'recall'}
                      className={`relative w-full h-full rounded-xl sm:rounded-2xl border-2 transition-all duration-300 ${tileStateClass} ${tileGlow}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl sm:rounded-2xl pointer-events-none" />
                    </motion.button>
                  );
                })}
              </div>

              {/* Recall Progress Bar */}
              {gameState.gameStatus === 'recall' && (
                <div className="w-full max-w-[500px] mt-8">
                  <Progress 
                    value={(gameState.selectedTiles.length / gameState.activeTiles.length) * 100} 
                    className="h-2 bg-background/50"
                    indicatorClassName="bg-[hsl(165,80%,48%)] shadow-[0_0_10px_hsla(165,80%,48%,0.5)]"
                  />
                </div>
              )}
            </motion.div>
          )}

          {gameState.gameStatus === 'gameover' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center z-10"
            >
              <Trophy className="h-20 w-20 text-[hsl(45,100%,50%)] mx-auto mb-6 drop-shadow-[0_0_20px_hsla(45,100%,50%,0.4)]" />
              <h3 className="text-4xl font-black text-white mb-2 tracking-tight">Simulation Terminated</h3>
              
              <div className="bg-[hsla(225,20%,10%,0.8)] border border-white/10 rounded-2xl p-6 mb-8 mt-6 inline-block text-left min-w-[300px]">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                  <span className="text-muted-foreground uppercase tracking-widest text-sm">Final Score</span>
                  <span className="text-3xl font-black text-white">{gameState.score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground uppercase tracking-widest text-sm">Peak Level</span>
                  <span className="text-xl font-bold text-[hsl(245,82%,63%)]">{gameState.level}</span>
                </div>
              </div>
              
              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGameState({ ...gameState, gameStatus: 'waiting' });
                    setGameStartTime(null);
                  }}
                  className="h-14 px-8 border-white/20 hover:bg-white/10 text-white rounded-xl"
                >
                  <RotateCcw className="mr-2 h-5 w-5" /> Reboot Matrix
                </Button>
                <Button 
                  onClick={onGameEnd} 
                  className="h-14 px-8 bg-white text-black hover:bg-gray-200 rounded-xl font-bold"
                >
                  Exit Protocol
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
