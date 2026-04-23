'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface TourStep {
  targetId: string;
  title: string;
  content: string;
  position: 'right' | 'left' | 'bottom' | 'top';
}

interface OnboardingTourProps {
  userEmail: string;
  role: string;
}

// ──────────────────────────────────────
// Tour Steps
// ──────────────────────────────────────

const baseSteps: TourStep[] = [
  {
    targetId: 'crm-sidebar',
    title: 'Welcome! 👋',
    content: 'This is your sidebar navigation. Let\'s take a quick tour of the CRM.',
    position: 'right',
  },
  {
    targetId: 'sidebar-dashboard',
    title: 'Dashboard',
    content: 'Your Dashboard shows today\'s stats, hot leads, and follow-ups at a glance.',
    position: 'right',
  },
  {
    targetId: 'sidebar-leads',
    title: 'My Leads',
    content: 'All your assigned leads are here. Search, filter, and manage them easily.',
    position: 'right',
  },
  {
    targetId: 'sidebar-pipeline',
    title: 'Pipeline',
    content: 'Visual pipeline board. Drag cards to update lead stages in real-time.',
    position: 'right',
  },
  {
    targetId: 'sidebar-follow-ups',
    title: 'Follow-Ups',
    content: 'Track your follow-ups here. Red items are overdue — don\'t miss them!',
    position: 'right',
  },
  {
    targetId: 'sidebar-call-history',
    title: 'Call History',
    content: 'View all your past calls with AI-generated summaries and notes.',
    position: 'right',
  },
  {
    targetId: 'sidebar-help',
    title: 'Help & Support',
    content: 'Visit Help anytime for FAQs, documentation, and support contact.',
    position: 'right',
  },
];

const adminSteps: TourStep[] = [
  {
    targetId: 'sidebar-team',
    title: 'Team',
    content: 'Monitor team performance and manage lead assignments.',
    position: 'right',
  },
  {
    targetId: 'sidebar-reports',
    title: 'Reports',
    content: 'View team analytics and conversion reports to track performance.',
    position: 'right',
  },
];

const superAdminSteps: TourStep[] = [
  {
    targetId: 'sidebar-channel-setup',
    title: 'Channel Setup',
    content: 'Connect Facebook, Instagram, and WhatsApp here.',
    position: 'right',
  },
  {
    targetId: 'sidebar-settings',
    title: 'Settings',
    content: 'System configuration and AI agent settings. Full control over the CRM.',
    position: 'right',
  },
];

function getStepsForRole(role: string): TourStep[] {
  const steps = [...baseSteps];

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    steps.splice(6, 0, ...adminSteps);
  }

  if (role === 'SUPER_ADMIN') {
    const helpIndex = steps.findIndex((s) => s.targetId === 'sidebar-help');
    steps.splice(helpIndex, 0, ...superAdminSteps);
  }

  return steps;
}

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function OnboardingTour({ userEmail, role }: OnboardingTourProps) {
  const steps = useMemo(() => getStepsForRole(role), [role]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const isTransitioningRef = useRef(false);

  const TOUR_KEY = `sp_crm_tour_completed_${userEmail}`;
  const totalSteps = steps.length;

  // Handler functions — must be declared before effects that reference them
  function completeTour() {
    localStorage.setItem(TOUR_KEY, 'true');
    setIsActive(false);
    setTargetRect(null);
  }

  function handleNextClick() {
    if (isTransitioningRef.current) return;
    if (currentStep >= totalSteps - 1) {
      completeTour();
    } else {
      isTransitioningRef.current = true;
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        isTransitioningRef.current = false;
      }, 200);
    }
  }

  function handleBackClick() {
    if (isTransitioningRef.current) return;
    if (currentStep > 0) {
      isTransitioningRef.current = true;
      setTimeout(() => {
        setCurrentStep((prev) => prev - 1);
        isTransitioningRef.current = false;
      }, 200);
    }
  }

  // Check localStorage on mount
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [TOUR_KEY]);

  // Update target position when step changes
  useEffect(() => {
    if (!isActive) return;

    const step = steps[currentStep];
    if (!step) return;

    const updatePosition = () => {
      const el = document.querySelector(`[data-target-id="${step.targetId}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }
    };

    const timer = setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isActive, currentStep, steps]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        completeTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNextClick();
      } else if (e.key === 'ArrowLeft') {
        handleBackClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep, totalSteps, TOUR_KEY]);

  if (!isActive || !targetRect) return null;

  const step = steps[currentStep];
  if (!step) return null;

  // Calculate tooltip position
  const tooltipGap = 12;
  let tooltipStyle: React.CSSProperties = {};
  let arrowStyle: React.CSSProperties = {};

  switch (step.position) {
    case 'right':
      tooltipStyle = {
        left: targetRect.right + tooltipGap,
        top: targetRect.top + targetRect.height / 2,
        transform: 'translateY(-50%)',
      };
      arrowStyle = {
        left: -6,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
      };
      break;
    case 'left':
      tooltipStyle = {
        right: window.innerWidth - targetRect.left + tooltipGap,
        top: targetRect.top + targetRect.height / 2,
        transform: 'translateY(-50%)',
      };
      arrowStyle = {
        right: -6,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
      };
      break;
    case 'bottom':
      tooltipStyle = {
        left: targetRect.left + targetRect.width / 2,
        top: targetRect.bottom + tooltipGap,
        transform: 'translateX(-50%)',
      };
      arrowStyle = {
        top: -6,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
      };
      break;
    case 'top':
      tooltipStyle = {
        left: targetRect.left + targetRect.width / 2,
        bottom: window.innerHeight - targetRect.top + tooltipGap,
        transform: 'translateX(-50%)',
      };
      arrowStyle = {
        bottom: -6,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
      };
      break;
  }

  const spotlightPadding = 8;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Overlay with spotlight cutout */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
        }}
      />

      {/* Spotlight highlight around target */}
      <div
        className="absolute bg-white/10 rounded-lg transition-all duration-300"
        style={{
          left: targetRect.left - spotlightPadding,
          top: targetRect.top - spotlightPadding,
          width: targetRect.width + spotlightPadding * 2,
          height: targetRect.height + spotlightPadding * 2,
          border: '2px solid rgba(16, 185, 129, 0.5)',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
        }}
      />

      {/* Tooltip */}
      <div
        className="fixed z-[10000] pointer-events-auto"
        style={{
          ...tooltipStyle,
          maxWidth: Math.min(360, window.innerWidth - 40),
        }}
      >
        {/* Arrow */}
        <div
          className="absolute w-3 h-3 bg-white border-l border-t border-gray-200"
          style={arrowStyle}
        />

        {/* Tooltip content */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4">
          {/* Step counter */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {currentStep + 1} / {totalSteps}
            </span>
            <button
              onClick={completeTour}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title & content */}
          <h3 className="text-sm font-bold text-foreground mb-1">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              disabled={currentStep === 0}
              className="text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={completeTour}
                className="text-muted-foreground"
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={handleNextClick}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {currentStep === totalSteps - 1 ? 'Done' : 'Next'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
