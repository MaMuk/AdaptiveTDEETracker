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

function clickElement(selector) {
  const element = document.querySelector(selector)
  if (!element || typeof element.click !== 'function') return false
  element.click()
  return true
}

function clickButtonIn(selector, index = 0) {
  const button = document.querySelectorAll(`${selector} button`)[index]
  if (!button || typeof button.click !== 'function') return false
  button.click()
  return true
}

function clickFirstButtonIn(selector) {
  return clickButtonIn(selector, 0)
}

export async function startGuidedProductTour({ router, store, onFinish }) {
  stopActiveTour()
  const initialHistoryViewMode = store.historyViewMode === 'grid' ? 'grid' : 'list'
  store.historyViewMode = 'list'
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
    await waitForElement('[data-tour="settings-page"]')

    createPartTour([
      {
        element: '[data-tour="settings-page"]',
        popover: {
          title: 'Settings',
          description: 'You are now in Settings, where profile, goal, diary, AI, and app-level options are configured.'
        }
      },
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
    await router.push({ path: '/diary', query: { tourMock: '1' } })
    await nextTick()
    await waitForElement('[data-tour="diary-overall"]')

    let diaryTour = null
    let entryTour = null
    let aiTour = null

    const openSettingsFromEntryDialog = async () => {
      clickElement('[data-tour="entry-dialog-cancel"]')
      await nextTick()
      entryTour?.destroy()
      await openSettingsTour()
    }
    const openAiRecognitionPart = async () => {
      entryTour?.destroy()
      const openedFromDialog = clickElement('[data-tour="entry-dialog-ai"]')
      if (!openedFromDialog) {
        await router.push({ path: '/diary/ai-recognition', query: { tourMock: '1' } })
      }
      await nextTick()
      await waitForElement('[data-tour="diary-ai-flow"]')
      aiTour = createPartTour([
        {
          element: '[data-tour="diary-ai-flow"]',
          popover: {
            title: 'AI Recognition',
            description: 'Use this screen to select meal photos, add optional context, and review recognized meal details.'
          }
        },
        {
          element: '[data-tour="diary-ai-image-actions"]',
          popover: {
            title: 'Photo and Context',
            description: 'Choose a camera or gallery image. Label mode helps with packaged-food labels, and context can clarify portion size or ingredients.'
          }
        },
        {
          element: '[data-tour="diary-ai-review"]',
          popover: {
            title: 'Review Results',
            description: 'Pick the closest guess, then adjust the name, calories, and other draft values before saving.'
          }
        },
        {
          element: '[data-tour="diary-ai-section"]',
          popover: {
            title: 'Diary Section',
            description: 'Choose which diary section the reviewed result should be saved into.'
          }
        },
        ...(store.diaryMacroTrackingEnabled
          ? [{
              element: '[data-tour="diary-ai-macros"]',
              popover: {
                title: 'Macro Scaling',
                description: 'When macro tracking is enabled, changing calories scales the AI protein, carbohydrate, and fat draft values by the same ratio.'
              }
            }]
          : []),
        {
          element: '[data-tour="diary-ai-save"]',
          popover: {
            title: 'Save Recognized Meal',
            description: 'Saving adds the reviewed result to the diary.',
            onNextClick: async () => {
              aiTour.destroy()
              await openSettingsTour()
            }
          }
        }
      ], openSettingsTour)
    }
    const returnToCaloriesModeStep = async () => {
      clickButtonIn('[data-tour="entry-dialog-log-mode"]', 1)
      await nextTick()
      await waitForElement('[data-tour="entry-dialog-calories"]')
      entryTour.movePrevious()
    }
    const openEntryDialogPart = async () => {
      diaryTour?.destroy()
      if (!document.querySelector('[data-tour="entry-dialog"]')) {
        clickElement('[data-tour="diary-add-entry"]')
        await nextTick()
        await waitForElement('[data-tour="entry-dialog"]')
      }

      entryTour = createPartTour(entryDialogSteps, async () => {
        clickElement('[data-tour="entry-dialog-cancel"]')
        await nextTick()
        if (store.aiMealRecognitionEnabled) {
          await openAiRecognitionPart()
        } else {
          await openSettingsTour()
        }
      })
    }
    const entryDialogSteps = [
      {
        element: '[data-tour="entry-dialog"]',
        popover: {
          title: 'Entry Dialog',
          description: 'This dialog is where you enter one diary item manually and review the calories before saving.'
        }
      },
      {
        element: '[data-tour="entry-dialog-name"]',
        popover: {
          title: 'Food Name',
          description: 'Name the item here. Existing suggestions can appear as you type.'
        }
      },
      {
        element: '[data-tour="entry-dialog-log-mode"]',
        popover: {
          title: 'Entry Method',
          description: 'Choose measured input when you know amount and energy density, or calories when you already know the total.'
        }
      },
      {
        element: '[data-tour="entry-dialog-calories"]',
        popover: {
          title: 'Calories Mode',
          description: 'In calories mode, enter the total kcal for the item directly.',
          onNextClick: async () => {
            clickFirstButtonIn('[data-tour="entry-dialog-log-mode"]')
            await nextTick()
            await waitForElement('[data-tour="entry-dialog-energy-density"]')
            entryTour.moveNext()
          }
        }
      },
      {
        element: '[data-tour="entry-dialog-energy-density"]',
        popover: {
          title: 'Measured Mode',
          description: 'In measured mode, enter the amount, unit, and kcal density, such as kcal/100g, kcal/100ml, or kcal per serving.',
          onPrevClick: returnToCaloriesModeStep
        }
      },
      ...(store.diaryMacroTrackingEnabled
        ? [{
            element: '[data-tour="entry-dialog-protein"]',
            popover: {
              title: 'Macros',
              description: 'Enter protein, carbohydrates, and fat. In calories mode these are total grams; in measured mode they use the selected unit density.'
            }
          }]
        : []),
      {
        element: '[data-tour="entry-dialog-summary"]',
        popover: {
          title: 'Nutrition Summary',
          description: 'The dialog recalculates calories and macros here before the entry is saved.'
        }
      },
      {
        element: '[data-tour="entry-dialog-save"]',
        popover: {
          title: 'Save Entry',
          description: 'Saving writes the dialog values into the diary.',
          ...(!store.aiMealRecognitionEnabled ? { onNextClick: openSettingsFromEntryDialog } : {})
        }
      },
      ...(store.aiMealRecognitionEnabled
        ? [{
            element: '[data-tour="entry-dialog-ai"]',
            popover: {
              title: 'Recognize Meal',
              description: 'When experimental AI is enabled, this opens meal recognition from the dialog.',
              onNextClick: openAiRecognitionPart
            }
          }]
        : [])
    ]

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
        element: '[data-tour="diary-create-meal"]',
        popover: {
          title: 'Create Meal',
          description: 'Create Meal combines every entry in this section into one meal entry and replaces the original section rows after you save.'
        }
      },
      {
        element: '[data-tour="diary-add-entry"]',
        popover: {
          title: 'Add Entries',
          description: 'Use Add Entry for a single food item. It opens the entry dialog for manual input or suggestion-based entry.',
          onNextClick: openEntryDialogPart
        }
      }
    ], openEntryDialogPart)
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
        description: 'Shows saved daily logs and lets you choose whether to review them as a list or compact grid.'
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
        description: 'Use this icon to delete a saved entry.'
      }
    },
    {
      element: '[data-tour="history-view-toggle"]',
      popover: {
        title: 'History View Mode',
        description: 'Switch between List for row actions and Grid for a spreadsheet-style weekly overview.',
        onNextClick: async () => {
          store.historyViewMode = 'grid'
          await nextTick()
          await waitForElement('[data-tour="history-grid"]')
          trackerTour.moveNext()
        }
      }
    },
    {
      element: '[data-tour="history-grid"]',
      popover: {
        title: 'Grid View',
        description: 'Each week is grouped into weight and calorie rows. Tap a day cell to jump the tracker to that date.',
        onNextClick: async () => {
          store.historyViewMode = initialHistoryViewMode
          await nextTick()
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
