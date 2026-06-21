import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Chrome, Shield, Clock, Brain } from "lucide-react";

interface MonkModeSettings {
  duration: number; // in minutes
  blockSocialMedia: boolean;
  blockEntertainment: boolean;
  blockNotifications: boolean;
  blockSpecificSites: string[];
}

interface MonkModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const durationOptions = [
  { value: 25, label: "25 minutes (Pomodoro)", description: "Perfect for focused work sessions" },
  { value: 45, label: "45 minutes", description: "Extended focus session" },
  { value: 90, label: "90 minutes (Deep Work)", description: "Deep work and complex tasks" },
  { value: 120, label: "2 hours", description: "Long creative sessions" },
  { value: 0, label: "Custom", description: "Set your own duration" }
];

const blockingOptions = [
  {
    id: 'social-media',
    label: 'Social Media',
    description: 'Block Facebook, Twitter, Instagram, TikTok',
    icon: '📱',
    defaultChecked: true
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    description: 'Block Netflix, YouTube, gaming sites',
    icon: '🎬',
    defaultChecked: true
  },
  {
    id: 'notifications',
    label: 'All Notifications',
    description: 'Silence all system notifications',
    icon: '🔕',
    defaultChecked: false
  },
  {
    id: 'news',
    label: 'News & Blogs',
    description: 'Block news websites and blogs',
    icon: '📰',
    defaultChecked: false
  }
];

export default function MonkModeModal({ isOpen, onClose }: MonkModeModalProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<MonkModeSettings>({
    duration: 25,
    blockSocialMedia: true,
    blockEntertainment: true,
    blockNotifications: false,
    blockSpecificSites: []
  });
  const [isStarting, setIsStarting] = useState(false);

  const handleStartMonkMode = async () => {
    setIsStarting(true);
    
    // Simulate slight delay for dramatic effect
    setTimeout(() => {
      toast({
        title: "🧘 Monk Mode Activated",
        description: `Focus session started for ${settings.duration} minutes. Stay focused!`,
      });
      setIsStarting(false);
      onClose();
      
      // Dispatch custom event to the global MonkModeOverlay
      const event = new CustomEvent("monk-mode-start", { 
        detail: { duration: settings.duration } 
      });
      window.dispatchEvent(event);
      
    }, 1500);
  };

  const handleDurationChange = (value: string) => {
    setSettings(prev => ({ ...prev, duration: parseInt(value) }));
  };

  const toggleBlocking = (option: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      [`block${option.charAt(0).toUpperCase() + option.slice(1).replace('-', '')}`]: checked
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
              <Chrome className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Enter Monk Mode
              </DialogTitle>
              <DialogDescription>
                Block all distractions and focus on your most important task
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Duration Selection */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <h3 className="font-medium text-gray-900 dark:text-white">Focus Duration</h3>
              </div>
              
              <Select value={settings.duration.toString()} onValueChange={handleDurationChange}>
                <SelectTrigger data-testid="select-duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {option.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Blocking Options */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <h3 className="font-medium text-gray-900 dark:text-white">Block Distractions</h3>
              </div>
              
              <div className="space-y-3">
                {blockingOptions.map((option) => (
                  <div key={option.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={option.id}
                      defaultChecked={option.defaultChecked}
                      onCheckedChange={(checked) => 
                        toggleBlocking(option.id, checked as boolean)
                      }
                      data-testid={`checkbox-${option.id}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span>{option.icon}</span>
                        <label 
                          htmlFor={option.id}
                          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-medium text-purple-900 dark:text-purple-100">Benefits</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Badge variant="secondary" className="justify-start bg-white/50 text-purple-700 dark:text-purple-300">
                  🎯 Deep Focus
                </Badge>
                <Badge variant="secondary" className="justify-start bg-white/50 text-purple-700 dark:text-purple-300">
                  ⏰ Time Awareness
                </Badge>
                <Badge variant="secondary" className="justify-start bg-white/50 text-purple-700 dark:text-purple-300">
                  🚫 Distraction Free
                </Badge>
                <Badge variant="secondary" className="justify-start bg-white/50 text-purple-700 dark:text-purple-300">
                  📈 Productivity Boost
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            data-testid="button-cancel-monk-mode"
          >
            Cancel
          </Button>
          
          <Button
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            onClick={handleStartMonkMode}
            disabled={isStarting}
            data-testid="button-start-monk-mode"
          >
            <AnimatePresence mode="wait">
              {isStarting ? (
                <motion.div
                  key="loading"
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Starting...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="start"
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Chrome className="h-4 w-4" />
                  <span>Start Focus</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
