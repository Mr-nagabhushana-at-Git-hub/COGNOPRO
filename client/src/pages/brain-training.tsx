import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Trophy, Target, Zap, Play } from "lucide-react";
import MemoryGame from "@/components/brain-games/memory-game";
import LogicPuzzle from "@/components/brain-games/logic-puzzle";
import type { BrainGameScore } from "@shared/schema";

export default function BrainTraining() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const { data: scores, isLoading } = useQuery<BrainGameScore[]>({
    queryKey: ["/api/brain-games/scores"],
  });

  const games = [
    {
      id: "memory",
      title: "Memory Challenge",
      description: "Test and improve your working memory with sequence patterns",
      icon: Brain,
      color: "bg-purple-500",
      difficulty: "Medium",
      estimatedTime: "5-10 min",
      component: MemoryGame
    },
    {
      id: "logic",
      title: "Spatial Recall Matrix",
      description: "Advanced visual-spatial memory training with geometric grids",
      icon: Target,
      color: "bg-[hsl(245,82%,63%)]", 
      difficulty: "Hard",
      estimatedTime: "5-10 min",
      component: LogicPuzzle
    },
    {
      id: "pattern",
      title: "Pattern Recognition",
      description: "Identify and continue visual patterns",
      icon: Zap,
      color: "bg-green-500",
      difficulty: "Easy",
      estimatedTime: "3-7 min",
      component: null // Placeholder
    }
  ];

  const getTopScore = (gameType: string) => {
    if (!scores) return 0;
    const gameScores = scores.filter((score) => score.gameType === gameType);
    return gameScores.length > 0 ? Math.max(...gameScores.map((score) => score.score)) : 0;
  };

  const getGameStats = (gameType: string) => {
    if (!scores) return { played: 0, avgScore: 0, bestStreak: 0 };
    const gameScores = scores.filter((score) => score.gameType === gameType);
    const played = gameScores.length;
    const avgScore = played > 0 ? Math.round(gameScores.reduce((sum, score) => sum + score.score, 0) / played) : 0;
    return { played, avgScore, bestStreak: 0 };
  };

  if (activeGame) {
    const game = games.find(g => g.id === activeGame);
    if (game?.component) {
      const GameComponent = game.component;
      return (
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setActiveGame(null)}
              data-testid="button-back-to-games"
            >
              ← Back to Games
            </Button>
          </div>
          <GameComponent onGameEnd={() => setActiveGame(null)} />
        </div>
      );
    }
  }

  return (
    <motion.div 
      className="p-4 sm:p-6 lg:p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="h-8 w-8 text-white" />
          </div>
        </motion.div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Brain Training
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Enhance your cognitive abilities with scientifically-designed games and exercises
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? "..." : scores?.length || 0}
                </p>
                <p className="text-xs text-gray-500">Games Played</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">7</p>
                <p className="text-xs text-gray-500">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">85%</p>
                <p className="text-xs text-gray-500">Avg Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
                <p className="text-xs text-gray-500">IQ Points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game, index) => {
          const Icon = game.icon;
          const stats = getGameStats(game.id);
          
          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="card-hover cursor-pointer" data-testid={`card-game-${game.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 ${game.color} rounded-xl flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {game.difficulty}
                    </Badge>
                  </div>
                  
                  <CardTitle className="text-xl">{game.title}</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {game.description}
                  </p>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Best Score:</span>
                      <span className="font-semibold">{getTopScore(game.id)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Times Played:</span>
                      <span className="font-semibold">{stats.played}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Estimated Time:</span>
                      <span className="font-semibold">{game.estimatedTime}</span>
                    </div>
                    
                    <Button
                      className="w-full mt-4"
                      onClick={() => game.component ? setActiveGame(game.id) : null}
                      disabled={!game.component}
                      data-testid={`button-play-${game.id}`}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {game.component ? "Play Game" : "Coming Soon"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Scores */}
      {scores && scores.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scores.slice(0, 5).map((score: any, index: number) => (
                <div 
                  key={score.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`score-item-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${
                      score.gameType === 'memory' ? 'bg-purple-100 text-purple-600' :
                      score.gameType === 'logic' ? 'bg-blue-100 text-blue-600' :
                      'bg-green-100 text-green-600'
                    } rounded-lg flex items-center justify-center`}>
                      {score.gameType === 'memory' ? <Brain className="h-4 w-4" /> :
                       score.gameType === 'logic' ? <Target className="h-4 w-4" /> :
                       <Zap className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white capitalize">
                        {score.gameType} Challenge
                      </p>
                      <p className="text-sm text-gray-500">
                        Level {score.level} • {new Date(score.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {score.score}
                    </p>
                    {score.duration && (
                      <p className="text-sm text-gray-500">
                        {Math.floor(score.duration / 60)}:{(score.duration % 60).toString().padStart(2, '0')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
