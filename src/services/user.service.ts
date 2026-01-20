import { PrismaClient } from '@prisma/client';

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        privacy: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        privacy: true,
      },
    });
  }

  async create(data: {
    email: string;
    displayName: string;
    passwordHash: string;
    usernameLower?: string;
    photoURL?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        displayName: data.displayName,
        passwordHash: data.passwordHash,
        usernameLower: data.usernameLower,
        photoURL: data.photoURL || '',
        privacy: {
          create: {
            ringsVisibility: 'friends',
            allowFriendRequests: true,
            allowClanInvites: true,
          },
        },
      },
      include: {
        profile: true,
        privacy: true,
      },
    });
  }

  async updateProfile(userId: string, profileData: {
    age?: number;
    weight?: number;
    height?: number;
    activityLevel?: string;
    gender?: string;
    waterGoal?: number;
  }) {
    // Ensure waterGoal is at least 8 (minimum) if provided
    const processedData: any = {};
    
    if (profileData.age !== undefined) processedData.age = profileData.age;
    if (profileData.weight !== undefined) processedData.weight = profileData.weight;
    if (profileData.height !== undefined) processedData.height = profileData.height;
    if (profileData.activityLevel !== undefined) processedData.activityLevel = profileData.activityLevel;
    if (profileData.gender !== undefined) processedData.gender = profileData.gender;
    if (profileData.waterGoal !== undefined) {
      processedData.waterGoal = Math.max(profileData.waterGoal, 8);
    }
    
    // Build create data object, only including defined values
    const createData: any = { userId };
    if (profileData.age !== undefined) createData.age = profileData.age;
    if (profileData.weight !== undefined) createData.weight = profileData.weight;
    if (profileData.height !== undefined) createData.height = profileData.height;
    if (profileData.activityLevel !== undefined) createData.activityLevel = profileData.activityLevel;
    if (profileData.gender !== undefined) createData.gender = profileData.gender;
    createData.waterGoal = profileData.waterGoal ? Math.max(profileData.waterGoal, 8) : 8; // Always set, default to 8
    
    return this.prisma.userProfile.upsert({
      where: { userId },
      update: processedData,
      create: createData,
    });
  }

  async updatePrivacy(userId: string, privacyData: {
    ringsVisibility?: string;
    allowFriendRequests?: boolean;
    allowClanInvites?: boolean;
  }) {
    return this.prisma.userPrivacy.upsert({
      where: { userId },
      update: privacyData,
      create: {
        userId,
        ringsVisibility: privacyData.ringsVisibility || 'friends',
        allowFriendRequests: privacyData.allowFriendRequests ?? true,
        allowClanInvites: privacyData.allowClanInvites ?? true,
      },
    });
  }

  async searchUsers(searchTerm: string, limit: number = 50, offset: number = 0) {
    const where = searchTerm
      ? {
          OR: [
            { displayName: { contains: searchTerm, mode: 'insensitive' as const } },
            { email: { contains: searchTerm, mode: 'insensitive' as const } },
            { usernameLower: { contains: searchTerm.toLowerCase() } },
          ],
        }
      : {};

    return this.prisma.user.findMany({
      where,
      take: limit,
      skip: offset,
      include: {
        profile: true,
        privacy: true,
      },
      orderBy: { displayName: 'asc' },
    });
  }
}

