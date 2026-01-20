import { PrismaClient } from '@prisma/client';

export class CommunityService {
  constructor(private prisma: PrismaClient) {}

  // Friends
  async getFriends(userId: string) {
    return this.prisma.friend.findMany({
      where: { userId },
      include: {
        friend: {
          include: {
            profile: true,
            privacy: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFriendRequests(userId: string) {
    const [sent, received] = await Promise.all([
      this.prisma.friendRequest.findMany({
        where: {
          fromUid: userId,
          status: 'pending',
        },
        include: {
          toUser: {
            include: {
              profile: true,
              privacy: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.friendRequest.findMany({
        where: {
          toUid: userId,
          status: 'pending',
        },
        include: {
          fromUser: {
            include: {
              profile: true,
              privacy: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { sent, received };
  }

  async sendFriendRequest(fromUid: string, toUid: string) {
    // Check if already friends
    const existingFriend = await this.prisma.friend.findUnique({
      where: {
        userId_friendUid: {
          userId: fromUid,
          friendUid: toUid,
        },
      },
    });

    if (existingFriend) {
      throw new Error('Already friends');
    }

    // Check for existing request
    const existingRequest = await this.prisma.friendRequest.findUnique({
      where: {
        fromUid_toUid: {
          fromUid,
          toUid,
        },
      },
    });

    if (existingRequest && existingRequest.status === 'pending') {
      throw new Error('Friend request already sent');
    }

    // Check for reverse request
    const reverseRequest = await this.prisma.friendRequest.findUnique({
      where: {
        fromUid_toUid: {
          fromUid: toUid,
          toUid: fromUid,
        },
      },
    });

    if (reverseRequest && reverseRequest.status === 'pending') {
      // Auto-accept
      await this.prisma.$transaction([
        this.prisma.friend.createMany({
          data: [
            { userId: fromUid, friendUid: toUid, ringsShare: true },
            { userId: toUid, friendUid: fromUid, ringsShare: true },
          ],
        }),
        this.prisma.friendRequest.update({
          where: { id: reverseRequest.id },
          data: { status: 'accepted' },
        }),
      ]);

      return this.prisma.friendRequest.create({
        data: {
          fromUid,
          toUid,
          status: 'accepted',
        },
        include: {
          fromUser: true,
          toUser: true,
        },
      });
    }

    return this.prisma.friendRequest.create({
      data: {
        fromUid,
        toUid,
        status: 'pending',
      },
      include: {
        fromUser: true,
        toUser: true,
      },
    });
  }

  async acceptFriendRequest(fromUid: string, toUid: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: {
        fromUid_toUid: {
          fromUid,
          toUid,
        },
      },
    });

    if (!request || request.status !== 'pending') {
      throw new Error('Friend request not found or not pending');
    }

    await this.prisma.$transaction([
      this.prisma.friend.createMany({
        data: [
          { userId: fromUid, friendUid: toUid, ringsShare: true },
          { userId: toUid, friendUid: fromUid, ringsShare: true },
        ],
      }),
      this.prisma.friendRequest.update({
        where: { id: request.id },
        data: { status: 'accepted' },
      }),
    ]);

    return this.prisma.friend.findUnique({
      where: {
        userId_friendUid: {
          userId: toUid,
          friendUid: fromUid,
        },
      },
      include: {
        friend: {
          include: {
            profile: true,
            privacy: true,
          },
        },
      },
    });
  }

  async rejectFriendRequest(fromUid: string, toUid: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: {
        fromUid_toUid: {
          fromUid,
          toUid,
        },
      },
    });

    if (!request || request.status !== 'pending') {
      throw new Error('Friend request not found or not pending');
    }

    await this.prisma.friendRequest.update({
      where: { id: request.id },
      data: { status: 'rejected' },
    });

    return true;
  }

  async cancelFriendRequest(fromUid: string, toUid: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: {
        fromUid_toUid: {
          fromUid,
          toUid,
        },
      },
    });

    if (!request || request.status !== 'pending') {
      throw new Error('Friend request not found or not pending');
    }

    await this.prisma.friendRequest.update({
      where: { id: request.id },
      data: { status: 'canceled' },
    });

    return true;
  }

  async removeFriend(userId: string, friendUid: string) {
    await this.prisma.friend.deleteMany({
      where: {
        OR: [
          { userId, friendUid },
          { userId: friendUid, friendUid: userId },
        ],
      },
    });

    return true;
  }

  async blockUser(blockerUid: string, blockedUid: string) {
    await this.prisma.$transaction([
      // Remove friendship if exists
      this.prisma.friend.deleteMany({
        where: {
          OR: [
            { userId: blockerUid, friendUid: blockedUid },
            { userId: blockedUid, friendUid: blockerUid },
          ],
        },
      }),
      // Cancel pending requests
      this.prisma.friendRequest.updateMany({
        where: {
          OR: [
            { fromUid: blockerUid, toUid: blockedUid, status: 'pending' },
            { fromUid: blockedUid, toUid: blockerUid, status: 'pending' },
          ],
        },
        data: { status: 'canceled' },
      }),
      // Add to blocked list
      this.prisma.blockedUser.upsert({
        where: {
          blockerUid_blockedUid: {
            blockerUid,
            blockedUid,
          },
        },
        create: {
          blockerUid,
          blockedUid,
        },
        update: {},
      }),
    ]);

    return true;
  }

  async unblockUser(blockerUid: string, blockedUid: string) {
    await this.prisma.blockedUser.deleteMany({
      where: {
        blockerUid,
        blockedUid,
      },
    });

    return true;
  }

  // Clans
  async getUserClans(userId: string) {
    const memberships = await this.prisma.clanMember.findMany({
      where: { uid: userId, status: 'active' },
      include: {
        clan: {
          include: {
            owner: {
              include: {
                profile: true,
                privacy: true,
              },
            },
            members: {
              include: {
                user: {
                  include: {
                    profile: true,
                    privacy: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => m.clan);
  }

  async getClan(clanId: string) {
    return this.prisma.clan.findUnique({
      where: { id: clanId },
      include: {
        owner: {
          include: {
            profile: true,
            privacy: true,
          },
        },
        members: {
          include: {
            user: {
              include: {
                profile: true,
                privacy: true,
              },
            },
          },
        },
      },
    });
  }

  async createClan(ownerUid: string, name: string, description: string, privacy: string) {
    return this.prisma.clan.create({
      data: {
        name,
        description,
        privacy: privacy || 'inviteOnly',
        ownerUid,
        members: {
          create: {
            uid: ownerUid,
            role: 'owner',
            status: 'active',
          },
        },
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async inviteToClan(clanId: string, fromUid: string, toUid: string) {
    // Check if already member
    const existingMember = await this.prisma.clanMember.findUnique({
      where: {
        clanId_uid: {
          clanId,
          uid: toUid,
        },
      },
    });

    if (existingMember) {
      throw new Error('User already in clan');
    }

    // Check for existing invite
    const existingInvite = await this.prisma.clanInvite.findUnique({
      where: {
        clanId_toUid: {
          clanId,
          toUid,
        },
      },
    });

    if (existingInvite && existingInvite.status === 'pending') {
      throw new Error('Invite already sent');
    }

    return this.prisma.clanInvite.create({
      data: {
        clanId,
        fromUid,
        toUid,
        status: 'pending',
      },
      include: {
        clan: true,
        fromUser: true,
        toUser: true,
      },
    });
  }

  async respondClanInvite(clanId: string, toUid: string, action: string) {
    const invite = await this.prisma.clanInvite.findUnique({
      where: {
        clanId_toUid: {
          clanId,
          toUid,
        },
      },
    });

    if (!invite || invite.status !== 'pending') {
      throw new Error('Invite not found or not pending');
    }

    if (action === 'accept') {
      await this.prisma.$transaction([
        this.prisma.clanMember.create({
          data: {
            clanId,
            uid: toUid,
            role: 'member',
            status: 'active',
          },
        }),
        this.prisma.clanInvite.update({
          where: { id: invite.id },
          data: { status: 'accepted' },
        }),
      ]);
    } else {
      await this.prisma.clanInvite.update({
        where: { id: invite.id },
        data: { status: 'rejected' },
      });
    }

    return true;
  }

  async getClanInvites(userId: string) {
    return this.prisma.clanInvite.findMany({
      where: {
        toUid: userId,
        status: 'pending',
      },
      include: {
        clan: true,
        fromUser: {
          include: {
            profile: true,
            privacy: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async leaveClan(clanId: string, uid: string) {
    const member = await this.prisma.clanMember.findUnique({
      where: {
        clanId_uid: {
          clanId,
          uid,
        },
      },
    });

    if (!member) {
      throw new Error('Not a member');
    }

    if (member.role === 'owner') {
      throw new Error('Owner cannot leave clan');
    }

    await this.prisma.clanMember.delete({
      where: { id: member.id },
    });

    return true;
  }

  async removeClanMember(clanId: string, requesterUid: string, memberUid: string) {
    const requester = await this.prisma.clanMember.findUnique({
      where: {
        clanId_uid: {
          clanId,
          uid: requesterUid,
        },
      },
    });

    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      throw new Error('Insufficient permissions');
    }

    const member = await this.prisma.clanMember.findUnique({
      where: {
        clanId_uid: {
          clanId,
          uid: memberUid,
        },
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    if (member.role === 'owner') {
      throw new Error('Cannot remove owner');
    }

    await this.prisma.clanMember.delete({
      where: { id: member.id },
    });

    return true;
  }

  async updateClanRole(clanId: string, ownerUid: string, memberUid: string, newRole: string) {
    const owner = await this.prisma.clanMember.findUnique({
      where: {
        clanId_uid: {
          clanId,
          uid: ownerUid,
        },
      },
    });

    if (!owner || owner.role !== 'owner') {
      throw new Error('Only owner can update roles');
    }

    const member = await this.prisma.clanMember.findUnique({
      where: {
        clanId_uid: {
          clanId,
          uid: memberUid,
        },
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    if (newRole === 'owner') {
      // Transfer ownership
      await this.prisma.$transaction([
        this.prisma.clanMember.update({
          where: { id: owner.id },
          data: { role: 'admin' },
        }),
        this.prisma.clanMember.update({
          where: { id: member.id },
          data: { role: 'owner' },
        }),
        this.prisma.clan.update({
          where: { id: clanId },
          data: { ownerUid: memberUid },
        }),
      ]);
    } else {
      await this.prisma.clanMember.update({
        where: { id: member.id },
        data: { role: newRole },
      });
    }

    return this.prisma.clanMember.findUnique({
      where: { id: member.id },
      include: {
        user: true,
        clan: true,
      },
    });
  }

  async updateClanDetails(clanId: string, requesterUid: string, updates: {
    name?: string;
    description?: string;
    photoURL?: string;
    privacy?: string;
  }) {
    const member = await this.prisma.clanMember.findUnique({
      where: {
        clanId_uid: {
          clanId,
          uid: requesterUid,
        },
      },
    });

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new Error('Insufficient permissions');
    }

    return this.prisma.clan.update({
      where: { id: clanId },
      data: updates,
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  // Notifications
  async getNotifications(userId: string, limit: number = 50, offset: number = 0) {
    return this.prisma.notification.findMany({
      where: { userId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUnreadNotificationCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async createNotification(userId: string, type: string, title: string, body: string, data: any) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: JSON.stringify(data),
      },
    });
  }

  async markNotificationRead(userId: string, notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return true;
  }

  // Ring Stats
  async getRingStats(userId: string, date: string) {
    return this.prisma.ringStats.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });
  }

  async updateRingStats(userId: string, stats: any) {
    return this.prisma.ringStats.upsert({
      where: {
        userId_date: {
          userId,
          date: stats.date,
        },
      },
      update: {
        caloriesBurned: stats.caloriesBurned,
        steps: stats.steps,
        workoutMinutes: stats.workoutMinutes,
        goalCalories: stats.goalCalories,
        goalSteps: stats.goalSteps,
        goalMinutes: stats.goalMinutes,
      },
      create: {
        userId,
        date: stats.date,
        caloriesBurned: stats.caloriesBurned,
        steps: stats.steps,
        workoutMinutes: stats.workoutMinutes,
        goalCalories: stats.goalCalories,
        goalSteps: stats.goalSteps,
        goalMinutes: stats.goalMinutes,
      },
    });
  }
}

