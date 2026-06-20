import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Brain, Play, RotateCcw, Trophy, Volume2, Grid3X3 } from "lucide-react";

interface DualNBackProps {
  onGameEnd: () => void;
}

interface Stimulus {
  position: number;
  letter: string;
}

interface GameState {
  trials: Stimulus[];
  currentTrial: number;
  gameStatus: 'idle' | 'playing' | 'complete';
  nLevel: number;
  score: number;
  correct: number;
  total: number;
  streak: number;
  maxStreak: number;
}

const GRID_SIZE = 3;
const TOTAL_TRIALS = 30;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const getLetterFrequency = (letter: string): number => {
  const baseFreq = 220;
  const letterIndex = LETTERS.indexOf(letter);
  return baseFreq + letterIndex * 20;
};

export default function DualNBack({ onGameEnd }: DualNBackProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [gameState, setGameState] = useState<GameState>({
    trials: [],
    currentTrial: 0,
    gameStatus: 'idle',
    nLevel: 1,
    score: 0,
    correct: 0,
    total: 0,
    streak: 0,
    maxStreak: 0
  });

const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [activePosition, setActivePosition] = useState<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const saveScoreMutation = useMutation({
    mutationFn: async (scoreData: any) => {
      return await apiRequest('POST', '/api/brain-games/scores', scoreData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brain-games/scores"] });
    }
  });

  const playTone = useCallback((letter: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const freq = getLetterFrequency(letter);
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3);
    
    oscillator.start();
    oscillator.stop(audioContextRef.current.currentTime + 0.3);
  }, []);

  const generateTrials = useCallback((nLevel: number, count: number): Stimulus[] => {
    const trials: Stimulus[] = [];
    for (let i = 0; i < count; i++) {
      const position = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
      const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      trials.push({ position, letter });
    }
    return trials;
  }, []);

  const startGame = () => {
    const trials = generateTrials(1, TOTAL_TRIALS);
    setGameState({
      trials,
      currentTrial: 0,
      gameStatus: 'playing',
      nLevel: 1,
      score: 0,
      correct: 0,
      total: 0,
      streak: 0,
      maxStreak: 0
    });
    setGameStartTime(new Date());
  };

  const checkMatch = (type: 'position' | 'audio') => {
    if (gameState.gameStatus !== 'playing' || gameState.currentTrial < gameState.nLevel) return;

    const current = gameState.trials[gameState.currentTrial];
    const nBack = gameState.trials[gameState.currentTrial - gameState.nLevel];
    
    const isPositionMatch = current.position === nBack.position;
    const isAudioMatch = current.letter === nBack.letter;
    
    const hasMatch = type === 'position' ? isPositionMatch : isAudioMatch;

    if (hasMatch) {
      setGameState(prev => ({
        ...prev,
        score: prev.score + 10,
        correct: prev.correct + 1,
        total: prev.total + 1,
        streak: prev.streak + 1,
        maxStreak: Math.max(prev.maxStreak, prev.streak + 1)
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        total: prev.total + 1,
        streak: 0
      }));
    }
  };

  const startTrial = useCallback((trialIndex: number) => {
    if (trialIndex >= TOTAL_TRIALS) {
      setGameState(prev => ({ ...prev, gameStatus: 'complete' }));
      return;
    }

    const trial = gameState.trials[trialIndex];
    setActivePosition(trial.position);
    
    setTimeout(() => {
      playTone(trial.letter);
    }, 200);

    setTimeout(() => {
      setActivePosition(null);
      if (trialIndex + 1 < TOTAL_TRIALS) {
        setGameState(prev => ({ ...prev, currentTrial: trialIndex + 1 }));
      }
    }, 1000);
  }, [gameState.trials]);

  useEffect(() => {
    if (gameState.gameStatus === 'playing' && gameState.currentTrial < TOTAL_TRIALS) {
      const timer = setTimeout(() => {
        startTrial(gameState.currentTrial);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (gameState.gameStatus === 'playing' && gameState.currentTrial >= TOTAL_TRIALS) {
      setGameState(prev => ({ ...prev, gameStatus: 'complete' }));
    }
  }, [gameState.gameStatus, gameState.currentTrial, startTrial]);

  const endGame = async () => {
    if (gameStartTime && gameState.gameStatus === 'complete') {
      const duration = Math.floor((new Date().getTime() - gameStartTime.getTime()) / 1000);
      const accuracy = gameState.total > 0 ? Math.round((gameState.correct / gameState.total) * 100) : 0;
      
      try {
        await saveScoreMutation.mutateAsync({
          gameType: 'dual-n-back',
          score: gameState.score,
          level: gameState.nLevel,
          duration: duration
        });
        
        toast({
          title: "🧠 Dual N-Back Complete!",
          description: `Score: ${gameState.score} • Accuracy: ${accuracy}%`,
        });
      } catch (error) {
        toast({
          title: "Game Complete",
          description: `Score: ${gameState.score} • Accuracy: ${accuracy}%`,
        });
      }
    }
  };

  useEffect(() => {
    if (gameState.gameStatus === 'complete') {
      endGame();
    }
  }, [gameState.gameStatus]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState.gameStatus !== 'playing') return;
      
      if (e.key.toLowerCase() === 'a') {
        checkMatch('position');
      } else if (e.key.toLowerCase() === 'l') {
        checkMatch('audio');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState.gameStatus, gameState.currentTrial, gameState.trials, gameState.nLevel]);

  const resetGame = () => {
    setGameState({
      trials: [],
      currentTrial: 0,
      gameStatus: 'idle',
      nLevel: 1,
      score: 0,
      correct: 0,
      total: 0,
      streak: 0,
      maxStreak: 0
    });
    setGameStartTime(null);
    setActivePosition(null);
  };

  const getPositionMatches = () => {
    if (gameState.currentTrial < gameState.nLevel) return false;
    const current = gameState.trials[gameState.currentTrial];
    const nBack = gameState.trials[gameState.currentTrial - gameState.nLevel];
    return current.position === nBack.position;
  };

  const getAudioMatches = () => {
    if (gameState.currentTrial < gameState.nLevel) return false;
    const current = gameState.trials[gameState.currentTrial];
    const nBack = gameState.trials[gameState.currentTrial - gameState.nLevel];
    return current.letter === nBack.letter;
  };

  const accuracy = gameState.total > 0 ? Math.round((gameState.correct / gameState.total) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center">
                <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-xl">Dual N-Back</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Test working memory with position and audio stimuli
                </p>
              </div>
            </div>
            
            <Button variant="outline" onClick={onGameEnd} data-testid="button-exit-game">
              Exit Game
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-game-score">
              {gameState.score}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Score</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-game-level">
              {gameState.nLevel}-Back
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">N-Level</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {accuracy}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Accuracy</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {gameState.maxStreak}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Best Streak</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          {gameState.gameStatus === 'idle' ? (
            <div className="text-center py-12">
              <Grid3X3 className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Ready for Dual N-Back Challenge?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                Watch the grid and listen for audio. Press 'A' when the position matches N trials back,
                Press 'L' when the letter matches N trials back. N increases as you improve!
              </p>
              <div className="flex justify-center space-x-4 mb-4">
                <Badge variant="outline" className="px-4">A: Position Match</Badge>
                <Badge variant="outline" className="px-4">L: Audio Match</Badge>
              </div>
              <Button
                size="lg"
                onClick={startGame}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-start-game"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Game
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <AnimatePresence mode="wait">
                  {gameState.gameStatus === 'playing' && (
                    <motion.div
                      key="playing"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                        Trial {gameState.currentTrial + 1}/{TOTAL_TRIALS}
                      </Badge>
                    </motion.div>
                  )}
                  
                  {gameState.gameStatus === 'complete' && (
                    <motion.div
                      key="complete"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Badge className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                        ✅ Complete!
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
                  const isActive = activePosition === index;
                  
                  return (
                    <motion.div
                      key={index}
                      className={`
                        aspect-square rounded-lg border-2 transition-all duration-200 flex items-center justify-center
                        ${isActive
                          ? 'bg-purple-500 border-purple-600 shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                        }
                      `}
                      animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                      data-testid={`grid-cell-${index}`}
                    >
                      <span className="text-lg font-mono text-gray-600 dark:text-gray-300">
                        {index + 1}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Volume2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Listen for letters (A-Z)
                  </span>
                </div>
                
                {gameState.currentTrial >= gameState.nLevel && (
                  <div className="flex justify-center space-x-4">
                    <Badge 
                      className="cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/50 px-6 py-2"
                      onClick={() => checkMatch('position')}
                    >
                      A: Position Match
                    </Badge>
                    <Badge 
                      className="cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/50 px-6 py-2"
                      onClick={() => checkMatch('audio')}
                    >
                      L: Audio Match
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {gameState.gameStatus === 'complete' && (
            <motion.div
              className="text-center py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Game Complete!
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Final Score: <strong>{gameState.score}</strong>
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Accuracy: <strong>{accuracy}%</strong> • Best Streak: <strong>{gameState.maxStreak}</strong>
              </p>
              
              <div className="flex justify-center space-x-3">
                <Button
                  variant="outline"
                  onClick={resetGame}
                  data-testid="button-play-again"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Play Again
                </Button>
                <Button onClick={onGameEnd} data-testid="button-finish-game">
                  <Trophy className="mr-2 h-4 w-4" />
                  Finish
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}