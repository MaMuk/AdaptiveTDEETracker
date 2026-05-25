import { nextTick } from 'vue'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

let activeDriver = null

function stopActiveTour() {
  if (activeDriver) {
    activeDriver.destroy()
    activeDriver = null
  }
}

async function waitForElement(selector, timeoutMs = 3000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (document.querySelector(selector)) return true
    await new Promise(resolve => setTimeout(resolve, 80))
  }
  return false
}

function createTour(steps) {
  const tour = driver({
    showProgress: true,
    animate: true,
    steps
  })
  activeDriver = tour
  tour.drive()
  return tour
}

export async function startGuidedProductTour({ router, store, onFinish }) {
  stopActiveTour()
  await router.push({ path: '/', query: { tourMock: '1' } })
  await nextTick()
  await waitForElement('[data-tour="tracking-fields-card"]')

  let trackerTour = null
  const goToDiary = Boolean(store.foodDiaryEnabled)

  const createPartTour = (steps, onSkipNextPart) => {
    const partTour = driver({
      showProgress: true,
      animate: true,
      steps,
      onPopoverRender: (popover) => {
        if (!popover?.footerButtons) return
        const skipBtn = document.createElement('button')
        skipBtn.innerText = 'Skip Part'
        skipBtn.type = 'button'
        skipBtn.className = 'tour-skip-next-btn'
        skipBtn.setAttribute('aria-label', 'Skip to next part')
        skipBtn.setAttribute('title', 'Skip to next part')
        popover.footerButtons.prepend(skipBtn)
        skipBtn.addEventListener('click', async (event) => {
          event.preventDefault()
          event.stopPropagation()
          partTour.destroy()
          if (typeof onSkipNextPart === 'function') {
            await Promise.resolve(onSkipNextPart())
          }
        })
      }
    })
    activeDriver = partTour
    partTour.drive()
    return partTour
  }

  const openSettingsTour = async () => {
    stopActiveTour()
    await router.push('/settings')
    await nextTick()
    await waitForElement('[data-tour="settings-profile"]')

    createPartTour([
      {
        element: '[data-tour="settings-profile"]',
        popover: {
          title: 'Profile Settings',
          description: 'Adjust profile values and target rate here.'
        }
      },
      {
        element: '[data-tour="settings-startup-assist"]',
        popover: {
          title: 'Startup Activity Assist',
          description: 'Configure activity-based startup support and blend.'
        }
      },
      {
        element: '[data-tour="settings-diary"]',
        popover: {
          title: 'Diary Settings',
          description: 'Enable and configure diary sections and targets.'
        }
      },
      {
        element: '[data-tour="settings-ai"]',
        popover: {
          title: 'Experimental AI',
          description: 'Enable AI meal recognition and set your local API key.'
        }
      },
      {
        element: '[data-tour="settings-start-tour"]',
        popover: {
          title: 'Replay Tour',
          description: 'Use this button any time to start the guided tour again.',
          onNextClick: () => {
            stopActiveTour()
            if (typeof onFinish === 'function') onFinish()
          }
        }
      }
    ], () => {
      stopActiveTour()
      if (typeof onFinish === 'function') onFinish()
    })
  }

  const openDiaryTour = async () => {
    stopActiveTour()
    await router.push('/diary')
    await nextTick()
    await waitForElement('[data-tour="diary-overall"]')

    let diaryTour = null
    diaryTour = createPartTour([
      {
        element: '[data-tour="footer-diary"]',
        popover: {
          title: 'Diary Tab',
          description: 'You are now in the diary section for meal-by-meal tracking.'
        }
      },
      {
        element: '[data-tour="diary-overall"]',
        popover: {
          title: 'Diary Overview',
          description: 'Track total consumed calories against your daily budget. Tap the calorie bar to show remaining calories.'
        }
      },
      {
        element: '[data-tour="diary-section-first"]',
        popover: {
          title: 'Sections',
          description: 'Log meals per section, lock sections, and monitor section targets.'
        }
      },
      {
        element: '[data-tour="diary-add-entry"]',
        popover: {
          title: 'Add Entries',
          description: 'Add entries manually or from history to build your day quickly.'
        }
      },
      {
        element: '[data-tour="diary-actions"]',
        popover: {
          title: 'Diary Actions',
          description: 'Use these actions to go back or start meal recognition when AI is enabled.',
          onNextClick: async () => {
            diaryTour.destroy()
            await openSettingsTour()
          }
        }
      }
    ], openSettingsTour)
  }

  const startNavigationPart = async () => {
    trackerTour = createPartTour([
      {
        element: '[data-tour="footer"]',
        popover: {
          title: 'Navigation',
          description: 'This footer is the main navigation area for moving between app sections.'
        }
      },
      {
        element: '[data-tour="footer-tracker"]',
        popover: {
          title: 'Tracker Tab',
          description: 'Returns you to the main tracker screen.'
        }
      },
      ...(goToDiary
        ? [{
            element: '[data-tour="footer-diary"]',
            popover: {
              title: 'Diary Tab',
              description: 'Opens the Food Diary for meal-by-meal tracking.'
            }
          }]
        : []),
      {
        element: '[data-tour="footer-statistics"]',
        popover: {
          title: 'Chart Tab',
          description: 'Opens chart/statistics view for weight and calorie history.'
        }
      },
      ...(goToDiary
        ? [{
            element: '[data-tour="footer-suggestions"]',
            popover: {
              title: 'Food Suggestions Tab',
              description: 'Manage reusable food suggestion entries here.'
            }
          }]
        : []),
      {
        element: '[data-tour="footer-settings"]',
        popover: {
          title: 'Settings Tab',
          description: 'Opens settings and data transfer tools.',
          onNextClick: async () => {
            trackerTour.destroy()
            await router.replace({ path: '/', query: {} })
            if (goToDiary) {
              await openDiaryTour()
            } else {
              await openSettingsTour()
            }
          }
        }
      }
    ], async () => {
      await router.replace({ path: '/', query: {} })
      if (goToDiary) {
        await openDiaryTour()
      } else {
        await openSettingsTour()
      }
    })
  }

  const startOverviewPart = async () => {
    trackerTour = createPartTour([
      {
        element: '[data-tour="info-overview-card"]',
        popover: {
          title: 'Overview Card',
          description: 'This summary card contains your main trend and target information.'
        }
      },
      {
        element: '[data-tour="current-weight-card"]',
        popover: {
          title: 'Current Weight Info',
          description: 'Shows your recent average weight and change from starting weight.'
        }
      },
      {
        element: '[data-tour="goal-weight-card"]',
        popover: {
          title: 'Goal Weight Info',
          description: 'Shows your target and remaining difference from your current trend.'
        }
      },
      {
        element: '[data-tour="goal-calories-card"]',
        popover: {
          title: 'Estimated Calories',
          description: 'Displays your estimated calories based on goal and maintenance estimate.'
        }
      },
      {
        element: '[data-tour="last7-card"]',
        popover: {
          title: 'Last 7 Days Info',
          description: 'Summarizes your weekly weight and calorie trend.',
          onNextClick: async () => {
            trackerTour.destroy()
            await startNavigationPart()
          }
        }
      }
    ], startNavigationPart)
  }

  trackerTour = createPartTour([
    {
      element: '[data-tour="tracking-fields-card"]',
      popover: {
        title: 'Tracking',
        description: 'This card is where you log daily weight and calories.'
      }
    },
    {
      element: '[data-tour="save-entry-btn"]',
      popover: {
        title: 'Save Entry',
        description: 'Saves or updates the selected day log.'
      }
    },
    {
      element: '[data-tour="date-select-btn"]',
      popover: {
        title: 'Select Date',
        description: 'Pick any date to view or edit that day.'
      }
    },
    {
      element: '[data-tour="history-section"]',
      popover: {
        title: 'History',
        description: 'Shows saved daily entries so you can revisit prior days quickly.'
      }
    },
    {
      element: '[data-tour="history-row-first"]',
      popover: {
        title: 'History Row Action',
        description: 'Clicking a row jumps the tracker to that date.'
      }
    },
    {
      element: '[data-tour="history-delete-first"]',
      popover: {
        title: 'Delete Entry Action',
        description: 'Use this icon to delete a saved entry.',
        onNextClick: async () => {
          trackerTour.destroy()
          await startOverviewPart()
        }
      }
    }
  ], startOverviewPart)

  return trackerTour
}

export function stopGuidedProductTour() {
  stopActiveTour()
}
