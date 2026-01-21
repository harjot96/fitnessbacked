import { PrismaClient } from '@prisma/client';

export class HealthService {
  constructor(private prisma: PrismaClient) {}

  async getDailyHealthData(userId: string, date: string) {
    console.log(`[HealthService] getDailyHealthData: userId=${userId}, date=${date}`);
    const data = await this.prisma.dailyHealthData.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      include: {
        meals: {
          orderBy: { timestamp: 'asc' },
        },
        waterEntries: {
          orderBy: { timestamp: 'asc' },
        },
        workouts: {
          include: {
            exercises: true,
            locationPoints: {
              orderBy: { timestamp: 'asc' },
            },
          },
          orderBy: { startTime: 'asc' },
        },
        fastingSession: true,
      },
    });

    // Validate and auto-complete fasting session if it has exceeded target duration
    if (data?.fastingSession && !data.fastingSession.endTime && data.fastingSession.targetDuration) {
      const now = new Date();
      const startTime = new Date(data.fastingSession.startTime);
      const elapsedHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      if (elapsedHours >= data.fastingSession.targetDuration) {
        // Auto-complete the session
        await this.prisma.fastingSession.update({
          where: { id: data.fastingSession.id },
          data: {
            endTime: now,
            duration: data.fastingSession.targetDuration, // Cap at target duration
          },
        });
        
        // Return updated data
        return this.prisma.dailyHealthData.findUnique({
          where: {
            userId_date: {
              userId,
              date,
            },
          },
          include: {
            meals: {
              orderBy: { timestamp: 'asc' },
            },
            waterEntries: {
              orderBy: { timestamp: 'asc' },
            },
            workouts: {
              include: {
                exercises: true,
                locationPoints: {
                  orderBy: { timestamp: 'asc' },
                },
              },
              orderBy: { startTime: 'asc' },
            },
            fastingSession: true,
          },
        });
      }
    }

    if (data) {
      console.log(`[HealthService] Data found: date=${data.date}, hasFastingSession=${!!data.fastingSession}, fastingSessionId=${data.fastingSession?.id || 'none'}`);
    } else {
      console.log(`[HealthService] No data found for userId=${userId}, date=${date}`);
    }

    return data;
  }

  async getWeeklyHealthData(userId: string, startDate: string) {
    const dates: string[] = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const data = await this.prisma.dailyHealthData.findMany({
      where: {
        userId,
        date: { in: dates },
      },
      include: {
        meals: true,
        waterEntries: true,
        workouts: {
          include: {
            exercises: true,
            locationPoints: true,
          },
        },
        fastingSession: true,
      },
      orderBy: { date: 'asc' },
    });

    // Validate and auto-complete any fasting sessions that have exceeded target duration
    const now = new Date();
    const updatePromises = data
      .filter(d => d.fastingSession && !d.fastingSession.endTime && d.fastingSession.targetDuration)
      .map(d => {
        const startTime = new Date(d.fastingSession!.startTime);
        const elapsedHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        if (elapsedHours >= d.fastingSession!.targetDuration!) {
          return this.prisma.fastingSession.update({
            where: { id: d.fastingSession!.id },
            data: {
              endTime: now,
              duration: d.fastingSession!.targetDuration!, // Cap at target duration
            },
          });
        }
        return null;
      })
      .filter(p => p !== null) as Promise<any>[];

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      
      // Return updated data
      return this.prisma.dailyHealthData.findMany({
        where: {
          userId,
          date: { in: dates },
        },
        include: {
          meals: true,
          waterEntries: true,
          workouts: {
            include: {
              exercises: true,
              locationPoints: true,
            },
          },
          fastingSession: true,
        },
        orderBy: { date: 'asc' },
      });
    }

    return data;
  }

  async saveDailyHealthData(userId: string, data: any) {
    const {
      date,
      caloriesConsumed = 0,
      caloriesBurned = 0,
      activeEnergyBurned,
      dietaryEnergyConsumed,
      heartRate,
      restingHeartRate,
      steps = 0,
      waterIntake = 0,
    } = data;

    try {
      return await this.prisma.dailyHealthData.upsert({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
        update: {
          caloriesConsumed,
          caloriesBurned,
          activeEnergyBurned,
          dietaryEnergyConsumed,
          heartRate,
          restingHeartRate,
          steps,
          waterIntake,
        },
        create: {
          userId,
          date,
          caloriesConsumed,
          caloriesBurned,
          activeEnergyBurned,
          dietaryEnergyConsumed,
          heartRate,
          restingHeartRate,
          steps,
          waterIntake,
        },
        include: {
          meals: true,
          waterEntries: true,
          workouts: {
            include: {
              exercises: true,
              locationPoints: true,
            },
          },
          fastingSession: true,
        },
      });
    } catch (error: any) {
      // Handle unique constraint violation (race condition)
      if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
        console.log(`[HealthService] Unique constraint error, attempting to update existing record for userId=${userId}, date=${date}`);
        
        // Try to find and update the existing record
        const existing = await this.prisma.dailyHealthData.findUnique({
          where: {
            userId_date: {
              userId,
              date,
            },
          },
        });

        if (existing) {
          return await this.prisma.dailyHealthData.update({
            where: {
              userId_date: {
                userId,
                date,
              },
            },
            data: {
              caloriesConsumed,
              caloriesBurned,
              activeEnergyBurned,
              dietaryEnergyConsumed,
              heartRate,
              restingHeartRate,
              steps,
              waterIntake,
            },
            include: {
              meals: true,
              waterEntries: true,
              workouts: {
                include: {
                  exercises: true,
                  locationPoints: true,
                },
              },
              fastingSession: true,
            },
          });
        } else {
          // If record doesn't exist, there might be duplicates - find and use the first one
          const duplicates = await this.prisma.dailyHealthData.findMany({
            where: {
              userId,
              date,
            },
            orderBy: {
              createdAt: 'asc',
            },
          });

          if (duplicates.length > 0) {
            // Update the first (oldest) record and delete the rest
            const toKeep = duplicates[0];
            const toDelete = duplicates.slice(1);

            if (toDelete.length > 0) {
              await this.prisma.dailyHealthData.deleteMany({
                where: {
                  id: { in: toDelete.map(d => d.id) },
                },
              });
            }

            return await this.prisma.dailyHealthData.update({
              where: { id: toKeep.id },
              data: {
                caloriesConsumed,
                caloriesBurned,
                activeEnergyBurned,
                dietaryEnergyConsumed,
                heartRate,
                restingHeartRate,
                steps,
                waterIntake,
              },
              include: {
                meals: true,
                waterEntries: true,
                workouts: {
                  include: {
                    exercises: true,
                    locationPoints: true,
                  },
                },
                fastingSession: true,
              },
            });
          }
        }
      }
      
      // Re-throw if it's not a unique constraint error
      throw error;
    }
  }

  async addMeal(userId: string, date: string, mealData: any) {
    // Get or create daily health data
    let dailyData = await this.getDailyHealthData(userId, date);
    
    if (!dailyData) {
      dailyData = await this.prisma.dailyHealthData.create({
        data: {
          userId,
          date,
          caloriesConsumed: 0,
          caloriesBurned: 0,
          steps: 0,
          waterIntake: 0,
        },
        include: {
          meals: true,
          waterEntries: true,
          workouts: {
            include: {
              exercises: true,
              locationPoints: true,
            },
          },
          fastingSession: true,
        },
      });
    }

    const meal = await this.prisma.meal.create({
      data: {
        dailyHealthDataId: dailyData.id,
        type: mealData.type,
        name: mealData.name,
        calories: mealData.calories,
        carbs: mealData.carbs,
        protein: mealData.protein,
        fat: mealData.fat,
        timestamp: new Date(mealData.timestamp),
      },
    });

    // Update total calories consumed
    if (dailyData) {
      await this.prisma.dailyHealthData.update({
        where: { id: dailyData.id },
        data: {
          caloriesConsumed: {
            increment: mealData.calories,
          },
        },
      });
    }

    return meal;
  }

  async updateMeal(mealId: string, mealData: any) {
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!meal) {
      throw new Error('Meal not found');
    }

    const oldCalories = meal.calories;
    const newCalories = mealData.calories || oldCalories;

    const updated = await this.prisma.meal.update({
      where: { id: mealId },
      data: {
        type: mealData.type,
        name: mealData.name,
        calories: mealData.calories,
        carbs: mealData.carbs,
        protein: mealData.protein,
        fat: mealData.fat,
        timestamp: mealData.timestamp ? new Date(mealData.timestamp) : undefined,
      },
    });

    // Update daily calories if changed
    if (oldCalories !== newCalories) {
      const dailyData = await this.prisma.dailyHealthData.findUnique({
        where: { id: meal.dailyHealthDataId },
      });

      if (dailyData) {
        await this.prisma.dailyHealthData.update({
          where: { id: meal.dailyHealthDataId },
          data: {
            caloriesConsumed: dailyData.caloriesConsumed - oldCalories + newCalories,
          },
        });
      }
    }

    return updated;
  }

  async deleteMeal(mealId: string) {
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!meal) {
      throw new Error('Meal not found');
    }

    await this.prisma.meal.delete({
      where: { id: mealId },
    });

    // Update daily calories
    const dailyData = await this.prisma.dailyHealthData.findUnique({
      where: { id: meal.dailyHealthDataId },
    });

    if (dailyData) {
      await this.prisma.dailyHealthData.update({
        where: { id: meal.dailyHealthDataId },
        data: {
          caloriesConsumed: Math.max(0, dailyData.caloriesConsumed - meal.calories),
        },
      });
    }

    return true;
  }

  async addWaterEntry(userId: string, date: string, entryData: any) {
    let dailyData = await this.getDailyHealthData(userId, date);
    
    if (!dailyData) {
      dailyData = await this.prisma.dailyHealthData.create({
        data: {
          userId,
          date,
          caloriesConsumed: 0,
          caloriesBurned: 0,
          steps: 0,
          waterIntake: 0,
        },
        include: {
          meals: true,
          waterEntries: true,
          workouts: {
            include: {
              exercises: true,
              locationPoints: true,
            },
          },
          fastingSession: true,
        },
      });
    }

    const entry = await this.prisma.waterEntry.create({
      data: {
        dailyHealthDataId: dailyData.id,
        glasses: entryData.glasses,
        timestamp: new Date(entryData.timestamp),
      },
    });

    // Update total water intake
    if (dailyData) {
      await this.prisma.dailyHealthData.update({
        where: { id: dailyData.id },
        data: {
          waterIntake: {
            increment: entryData.glasses,
          },
        },
      });
    }

    return entry;
  }

  async addWorkout(userId: string, date: string, workoutData: any) {
    let dailyData = await this.getDailyHealthData(userId, date);
    
    if (!dailyData) {
      dailyData = await this.prisma.dailyHealthData.create({
        data: {
          userId,
          date,
          caloriesConsumed: 0,
          caloriesBurned: 0,
          steps: 0,
          waterIntake: 0,
        },
        include: {
          meals: true,
          waterEntries: true,
          workouts: {
            include: {
              exercises: true,
              locationPoints: true,
            },
          },
          fastingSession: true,
        },
      });
    }

    const workout = await this.prisma.workout.create({
      data: {
        dailyHealthDataId: dailyData.id,
        name: workoutData.name,
        type: workoutData.type,
        startTime: new Date(workoutData.startTime),
        endTime: workoutData.endTime ? new Date(workoutData.endTime) : null,
        duration: workoutData.duration,
        totalCaloriesBurned: workoutData.totalCaloriesBurned,
        distance: workoutData.distance,
        averageSpeed: workoutData.averageSpeed,
        maxSpeed: workoutData.maxSpeed,
        exercises: {
          create: workoutData.exercises?.map((exercise: any) => ({
            name: exercise.name,
            category: exercise.category,
            duration: exercise.duration,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            caloriesBurned: exercise.caloriesBurned,
            notes: exercise.notes,
          })) || [],
        },
        locationPoints: {
          create: workoutData.locationPoints?.map((point: any) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: new Date(point.timestamp),
            altitude: point.altitude,
            speed: point.speed,
            accuracy: point.accuracy,
          })) || [],
        },
      },
      include: {
        exercises: true,
        locationPoints: true,
      },
    });

    // Update daily calories burned
    if (dailyData) {
      await this.prisma.dailyHealthData.update({
        where: { id: dailyData.id },
        data: {
          caloriesBurned: {
            increment: workoutData.totalCaloriesBurned,
          },
        },
      });
    }

    return workout;
  }

  async updateWorkout(workoutId: string, workoutData: any) {
    const workout = await this.prisma.workout.findUnique({
      where: { id: workoutId },
      include: { exercises: true, locationPoints: true },
    });

    if (!workout) {
      throw new Error('Workout not found');
    }

    const oldCalories = workout.totalCaloriesBurned;
    const newCalories = workoutData.totalCaloriesBurned || oldCalories;

    // Delete existing exercises and location points
    await this.prisma.exercise.deleteMany({
      where: { workoutId },
    });
    await this.prisma.locationPoint.deleteMany({
      where: { workoutId },
    });

    const updated = await this.prisma.workout.update({
      where: { id: workoutId },
      data: {
        name: workoutData.name,
        type: workoutData.type,
        startTime: workoutData.startTime ? new Date(workoutData.startTime) : undefined,
        endTime: workoutData.endTime ? new Date(workoutData.endTime) : undefined,
        duration: workoutData.duration,
        totalCaloriesBurned: workoutData.totalCaloriesBurned,
        distance: workoutData.distance,
        averageSpeed: workoutData.averageSpeed,
        maxSpeed: workoutData.maxSpeed,
        exercises: {
          create: workoutData.exercises?.map((exercise: any) => ({
            name: exercise.name,
            category: exercise.category,
            duration: exercise.duration,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            caloriesBurned: exercise.caloriesBurned,
            notes: exercise.notes,
          })) || [],
        },
        locationPoints: {
          create: workoutData.locationPoints?.map((point: any) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: new Date(point.timestamp),
            altitude: point.altitude,
            speed: point.speed,
            accuracy: point.accuracy,
          })) || [],
        },
      },
      include: {
        exercises: true,
        locationPoints: true,
      },
    });

    // Update daily calories if changed
    if (oldCalories !== newCalories) {
      const dailyData = await this.prisma.dailyHealthData.findUnique({
        where: { id: workout.dailyHealthDataId },
      });

      if (dailyData) {
        await this.prisma.dailyHealthData.update({
          where: { id: workout.dailyHealthDataId },
          data: {
            caloriesBurned: dailyData.caloriesBurned - oldCalories + newCalories,
          },
        });
      }
    }

    return updated;
  }

  async deleteWorkout(workoutId: string) {
    const workout = await this.prisma.workout.findUnique({
      where: { id: workoutId },
    });

    if (!workout) {
      throw new Error('Workout not found');
    }

    await this.prisma.workout.delete({
      where: { id: workoutId },
    });

    // Update daily calories
    const dailyData = await this.prisma.dailyHealthData.findUnique({
      where: { id: workout.dailyHealthDataId },
    });

    if (dailyData) {
      await this.prisma.dailyHealthData.update({
        where: { id: workout.dailyHealthDataId },
        data: {
          caloriesBurned: Math.max(0, dailyData.caloriesBurned - workout.totalCaloriesBurned),
        },
      });
    }

    return true;
  }

  async startFastingSession(userId: string, date: string, type: string, targetDuration?: number, eatingWindowStart?: number, eatingWindowEnd?: number) {
    // Get or create daily health data
    let dailyData = await this.getDailyHealthData(userId, date);
    
    if (!dailyData) {
      dailyData = await this.prisma.dailyHealthData.create({
        data: {
          userId,
          date,
          caloriesConsumed: 0,
          caloriesBurned: 0,
          steps: 0,
          waterIntake: 0,
        },
        include: {
          meals: true,
          waterEntries: true,
          workouts: {
            include: {
              exercises: true,
              locationPoints: true,
            },
          },
          fastingSession: true,
        },
      });
    }

    // Check if there's already an active fasting session
    if (dailyData.fastingSession && !dailyData.fastingSession.endTime) {
      throw new Error('An active fasting session already exists. Please end the current session before starting a new one.');
    }

    const startTime = new Date();
    const targetDurationValue = targetDuration ? Math.round(targetDuration) : null;

    try {
      if (!dailyData) {
        throw new Error('Daily health data not found');
      }
      
      const result = await this.prisma.fastingSession.create({
        data: {
          dailyHealthDataId: dailyData.id,
          type,
          startTime,
          endTime: null,
          duration: 0,
          targetDuration: targetDurationValue,
          eatingWindowStart: eatingWindowStart ?? null,
          eatingWindowEnd: eatingWindowEnd ?? null,
        },
      });

      console.log(`[HealthService] Fasting session started: id=${result.id}, type=${result.type}, date=${date}`);
      return result;
    } catch (error: any) {
      console.error(`[HealthService] Error starting fasting session for userId=${userId}, date=${date}:`, error);
      throw new Error(`Failed to start fasting session: ${error.message}`);
    }
  }

  async endFastingSession(userId: string, date: string) {
    // Get daily health data
    const dailyData = await this.getDailyHealthData(userId, date);
    
    if (!dailyData) {
      throw new Error('Daily health data not found');
    }

    if (!dailyData.fastingSession) {
      throw new Error('No active fasting session found');
    }

    if (dailyData.fastingSession.endTime) {
      throw new Error('Fasting session has already ended');
    }

    const endTime = new Date();
    const startTime = new Date(dailyData.fastingSession.startTime);
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const durationValue = Math.round(durationHours);

    try {
      const result = await this.prisma.fastingSession.update({
        where: { id: dailyData.fastingSession.id },
        data: {
          endTime,
          duration: durationValue,
        },
      });

      console.log(`[HealthService] Fasting session ended: id=${result.id}, duration=${result.duration} hours, date=${date}`);
      return result;
    } catch (error: any) {
      console.error(`[HealthService] Error ending fasting session for userId=${userId}, date=${date}:`, error);
      throw new Error(`Failed to end fasting session: ${error.message}`);
    }
  }

  async saveFastingSession(userId: string, date: string, sessionData: any) {
    // Validate required fields
    if (!sessionData || !sessionData.type || !sessionData.startTime) {
      throw new Error('Missing required fields: type and startTime are required');
    }

    let dailyData = await this.getDailyHealthData(userId, date);
    
    if (!dailyData) {
      dailyData = await this.prisma.dailyHealthData.create({
        data: {
          userId,
          date,
          caloriesConsumed: 0,
          caloriesBurned: 0,
          steps: 0,
          waterIntake: 0,
        },
        include: {
          meals: true,
          waterEntries: true,
          workouts: {
            include: {
              exercises: true,
              locationPoints: true,
            },
          },
          fastingSession: true,
        },
      });
    }

    // Calculate actual duration if session is still active
    let duration = sessionData.duration || 0;
    let endTime = sessionData.endTime ? new Date(sessionData.endTime) : null;
    
    // If session is still active (no endTime) and targetDuration is set, check if it should be auto-completed
    if (!endTime && sessionData.targetDuration) {
      const startTime = new Date(sessionData.startTime);
      const now = new Date();
      const elapsedHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      // If target duration is reached, auto-complete the session
      if (elapsedHours >= sessionData.targetDuration) {
        endTime = now;
        duration = sessionData.targetDuration; // Cap duration at target
      } else {
        duration = elapsedHours;
      }
    } else if (sessionData.targetDuration && duration > sessionData.targetDuration) {
      // If duration exceeds target duration, cap it at target
      duration = sessionData.targetDuration;
    }

    // Ensure duration is a valid number (schema expects Int, so round if needed)
    // For very short sessions (< 30 minutes), round to 1 hour minimum to ensure they're saved
    // For longer sessions, use normal rounding
    const durationValue = duration < 0.5 ? 1 : Math.round(duration);
    const targetDurationValue = sessionData.targetDuration ? Math.round(sessionData.targetDuration) : null;

    try {
      if (!dailyData) {
        throw new Error('Daily health data not found');
      }
      
      const result = await this.prisma.fastingSession.upsert({
        where: { dailyHealthDataId: dailyData.id },
        update: {
          type: sessionData.type,
          startTime: new Date(sessionData.startTime),
          endTime: endTime,
          duration: durationValue,
          targetDuration: targetDurationValue,
          eatingWindowStart: sessionData.eatingWindowStart ?? null,
          eatingWindowEnd: sessionData.eatingWindowEnd ?? null,
        },
        create: {
          dailyHealthDataId: dailyData.id,
          type: sessionData.type,
          startTime: new Date(sessionData.startTime),
          endTime: endTime,
          duration: durationValue,
          targetDuration: targetDurationValue,
          eatingWindowStart: sessionData.eatingWindowStart ?? null,
          eatingWindowEnd: sessionData.eatingWindowEnd ?? null,
        },
      });

      console.log(`[HealthService] Fasting session saved successfully: id=${result.id}, type=${result.type}, duration=${result.duration}, date=${date}`);
      return result;
    } catch (error: any) {
      console.error(`[HealthService] Error saving fasting session for userId=${userId}, date=${date}:`, error);
      throw new Error(`Failed to save fasting session: ${error.message}`);
    }
  }
}

