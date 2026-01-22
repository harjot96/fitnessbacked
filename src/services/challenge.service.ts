import { PrismaClient } from '@prisma/client';
import { addDays } from 'date-fns';

const DEFAULT_CHALLENGES = [
  {
    slug: 'weekly',
    title: 'Weekly Momentum',
    description: 'Hit 2 of 3 daily goals for 7 days.',
    prizeAmount: 50,
    currency: 'USD',
    durationDays: 7,
    rules: ['Hit 2 of 3 daily goals each day', 'Complete 7 days'],
  },
  {
    slug: '30-day',
    title: '30-Day Consistency',
    description: 'Stack 30 days of steady habits.',
    prizeAmount: 250,
    currency: 'USD',
    durationDays: 30,
    rules: ['Hit 2 of 3 daily goals each day', 'Complete 30 days'],
  },
  {
    slug: '75-day',
    title: '75-Day Discipline',
    description: 'Crush all 3 daily goals for 75 days.',
    prizeAmount: 1000,
    currency: 'USD',
    durationDays: 75,
    rules: ['Hit all 3 daily goals each day', 'Complete 75 days'],
  },
];

export class ChallengeService {
  constructor(private prisma: PrismaClient) {}

  private async ensureDefaults(): Promise<void> {
    for (const challenge of DEFAULT_CHALLENGES) {
      const existing = await this.prisma.challenge.findUnique({
        where: { slug: challenge.slug },
        select: { id: true },
      });

      if (!existing) {
        const startsAt = new Date();
        const endsAt = addDays(startsAt, challenge.durationDays - 1);

        await this.prisma.challenge.create({
          data: {
            slug: challenge.slug,
            title: challenge.title,
            description: challenge.description,
            prizeAmount: challenge.prizeAmount,
            currency: challenge.currency,
            rules: challenge.rules,
            startsAt,
            endsAt,
          },
        });
      }
    }
  }

  async listChallenges(userId: string) {
    await this.ensureDefaults();

    const [challenges, enrolled] = await Promise.all([
      this.prisma.challenge.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          _count: { select: { enrollments: true } },
          enrollments: {
            take: 1,
            orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  photoURL: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.challengeEnrollment.findMany({
        where: { userId },
        select: { challengeId: true },
      }),
    ]);

    const enrolledSet = new Set(enrolled.map((item) => item.challengeId));

    return challenges.map((challenge) => ({
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      description: challenge.description,
      prizeAmount: challenge.prizeAmount,
      currency: challenge.currency,
      rules: challenge.rules,
      startsAt: challenge.startsAt,
      endsAt: challenge.endsAt,
      enrolledCount: challenge._count.enrollments,
      leader: challenge.enrollments[0]
        ? {
            uid: challenge.enrollments[0].user.id,
            displayName: challenge.enrollments[0].user.displayName,
            photoURL: challenge.enrollments[0].user.photoURL,
            score: challenge.enrollments[0].score,
          }
        : null,
      isEnrolled: enrolledSet.has(challenge.id),
    }));
  }

  async enroll(userId: string, slug: string) {
    const challenge = await this.prisma.challenge.findUnique({ where: { slug } });
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    await this.prisma.challengeEnrollment.upsert({
      where: {
        challengeId_userId: {
          challengeId: challenge.id,
          userId,
        },
      },
      update: {},
      create: {
        challengeId: challenge.id,
        userId,
      },
    });

    return challenge;
  }

  async updateProgress(userId: string, slug: string, score: number) {
    const challenge = await this.prisma.challenge.findUnique({ where: { slug } });
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    await this.prisma.challengeEnrollment.upsert({
      where: {
        challengeId_userId: {
          challengeId: challenge.id,
          userId,
        },
      },
      update: {
        score,
      },
      create: {
        challengeId: challenge.id,
        userId,
        score,
      },
    });
  }
}
