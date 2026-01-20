import { Response } from 'express';
import { CommunityService } from '../services/community.service';
import { prisma } from '../config/database';
import { sendSuccess, sendError, sendCreated } from '../utils/response.helper';
import { AuthRequest } from '../auth/middleware';

const communityService = new CommunityService(prisma);

export async function getFriends(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const friends = await communityService.getFriends(req.user.userId);
    return sendSuccess(res, friends);
  } catch (error: any) {
    console.error('Get friends error:', error);
    return sendError(res, error.message || 'Failed to get friends', 500);
  }
}

export async function getFriendRequests(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const requests = await communityService.getFriendRequests(req.user.userId);
    return sendSuccess(res, requests);
  } catch (error: any) {
    console.error('Get friend requests error:', error);
    return sendError(res, error.message || 'Failed to get friend requests', 500);
  }
}

export async function sendFriendRequest(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { toUid } = req.body;
    if (!toUid) {
      return sendError(res, 'toUid is required', 400, 'VALIDATION_ERROR');
    }

    const request = await communityService.sendFriendRequest(req.user.userId, toUid);
    return sendCreated(res, request, 'Friend request sent successfully');
  } catch (error: any) {
    console.error('Send friend request error:', error);
    if (error.message === 'Already friends' || error.message === 'Friend request already sent') {
      return sendError(res, error.message, 400, 'BAD_REQUEST');
    }
    return sendError(res, error.message || 'Failed to send friend request', 500);
  }
}

export async function acceptFriendRequest(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { fromUid } = req.params;
    const friend = await communityService.acceptFriendRequest(fromUid, req.user.userId);
    return sendSuccess(res, friend, 'Friend request accepted successfully');
  } catch (error: any) {
    console.error('Accept friend request error:', error);
    if (error.message === 'Friend request not found or not pending') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to accept friend request', 500);
  }
}

export async function rejectFriendRequest(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { fromUid } = req.params;
    await communityService.rejectFriendRequest(fromUid, req.user.userId);
    return sendSuccess(res, { success: true }, 'Friend request rejected successfully');
  } catch (error: any) {
    console.error('Reject friend request error:', error);
    if (error.message === 'Friend request not found or not pending') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to reject friend request', 500);
  }
}

export async function cancelFriendRequest(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { toUid } = req.params;
    await communityService.cancelFriendRequest(req.user.userId, toUid);
    return sendSuccess(res, { success: true }, 'Friend request canceled successfully');
  } catch (error: any) {
    console.error('Cancel friend request error:', error);
    if (error.message === 'Friend request not found or not pending') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to cancel friend request', 500);
  }
}

export async function removeFriend(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { friendUid } = req.params;
    await communityService.removeFriend(req.user.userId, friendUid);
    return sendSuccess(res, { success: true }, 'Friend removed successfully');
  } catch (error: any) {
    console.error('Remove friend error:', error);
    return sendError(res, error.message || 'Failed to remove friend', 500);
  }
}

export async function blockUser(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { blockedUid } = req.params;
    await communityService.blockUser(req.user.userId, blockedUid);
    return sendSuccess(res, { success: true }, 'User blocked successfully');
  } catch (error: any) {
    console.error('Block user error:', error);
    return sendError(res, error.message || 'Failed to block user', 500);
  }
}

export async function unblockUser(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { blockedUid } = req.params;
    await communityService.unblockUser(req.user.userId, blockedUid);
    return sendSuccess(res, { success: true }, 'User unblocked successfully');
  } catch (error: any) {
    console.error('Unblock user error:', error);
    return sendError(res, error.message || 'Failed to unblock user', 500);
  }
}

export async function getUserClans(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const clans = await communityService.getUserClans(req.user.userId);
    return sendSuccess(res, clans);
  } catch (error: any) {
    console.error('Get user clans error:', error);
    return sendError(res, error.message || 'Failed to get clans', 500);
  }
}

export async function getClan(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const clan = await communityService.getClan(id);

    if (!clan) {
      return sendError(res, 'Clan not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, clan);
  } catch (error: any) {
    console.error('Get clan error:', error);
    return sendError(res, error.message || 'Failed to get clan', 500);
  }
}

export async function createClan(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { name, description, privacy } = req.body;
    if (!name) {
      return sendError(res, 'Name is required', 400, 'VALIDATION_ERROR');
    }

    const clan = await communityService.createClan(
      req.user.userId,
      name,
      description || '',
      privacy || 'inviteOnly'
    );
    return sendCreated(res, clan, 'Clan created successfully');
  } catch (error: any) {
    console.error('Create clan error:', error);
    return sendError(res, error.message || 'Failed to create clan', 500);
  }
}

export async function updateClanDetails(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const { name, description, photoURL, privacy } = req.body;

    const clan = await communityService.updateClanDetails(id, req.user.userId, {
      name,
      description,
      photoURL,
      privacy,
    });
    return sendSuccess(res, clan, 'Clan updated successfully');
  } catch (error: any) {
    console.error('Update clan details error:', error);
    if (error.message === 'Insufficient permissions') {
      return sendError(res, error.message, 403, 'FORBIDDEN');
    }
    return sendError(res, error.message || 'Failed to update clan', 500);
  }
}

export async function inviteToClan(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const { toUid } = req.body;
    if (!toUid) {
      return sendError(res, 'toUid is required', 400, 'VALIDATION_ERROR');
    }

    const invite = await communityService.inviteToClan(id, req.user.userId, toUid);
    return sendCreated(res, invite, 'Clan invitation sent successfully');
  } catch (error: any) {
    console.error('Invite to clan error:', error);
    if (error.message === 'User already in clan' || error.message === 'Invite already sent') {
      return sendError(res, error.message, 400, 'BAD_REQUEST');
    }
    return sendError(res, error.message || 'Failed to invite to clan', 500);
  }
}

export async function respondClanInvite(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id, inviteId } = req.params;
    const { action } = req.body;
    if (!action || (action !== 'accept' && action !== 'reject')) {
      return sendError(res, 'Action must be "accept" or "reject"', 400, 'VALIDATION_ERROR');
    }

    await communityService.respondClanInvite(id, req.user.userId, action);
    return sendSuccess(res, { success: true }, `Clan invitation ${action}ed successfully`);
  } catch (error: any) {
    console.error('Respond clan invite error:', error);
    if (error.message === 'Invite not found or not pending') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to respond to clan invite', 500);
  }
}

export async function getClanInvites(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const invites = await communityService.getClanInvites(req.user.userId);
    return sendSuccess(res, invites);
  } catch (error: any) {
    console.error('Get clan invites error:', error);
    return sendError(res, error.message || 'Failed to get clan invites', 500);
  }
}

export async function leaveClan(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    await communityService.leaveClan(id, req.user.userId);
    return sendSuccess(res, { success: true }, 'Left clan successfully');
  } catch (error: any) {
    console.error('Leave clan error:', error);
    if (error.message === 'Not a member' || error.message === 'Owner cannot leave clan') {
      return sendError(res, error.message, 400, 'BAD_REQUEST');
    }
    return sendError(res, error.message || 'Failed to leave clan', 500);
  }
}

export async function removeClanMember(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id, memberUid } = req.params;
    await communityService.removeClanMember(id, req.user.userId, memberUid);
    return sendSuccess(res, { success: true }, 'Clan member removed successfully');
  } catch (error: any) {
    console.error('Remove clan member error:', error);
    if (error.message === 'Insufficient permissions' || error.message === 'Cannot remove owner') {
      return sendError(res, error.message, 403, 'FORBIDDEN');
    }
    if (error.message === 'Member not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to remove clan member', 500);
  }
}

export async function updateClanRole(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id, memberUid } = req.params;
    const { newRole } = req.body;
    if (!newRole) {
      return sendError(res, 'newRole is required', 400, 'VALIDATION_ERROR');
    }

    const member = await communityService.updateClanRole(id, req.user.userId, memberUid, newRole);
    return sendSuccess(res, member, 'Clan member role updated successfully');
  } catch (error: any) {
    console.error('Update clan role error:', error);
    if (error.message === 'Only owner can update roles' || error.message === 'Member not found') {
      return sendError(res, error.message, error.message === 'Only owner can update roles' ? 403 : 404, error.message === 'Only owner can update roles' ? 'FORBIDDEN' : 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to update clan role', 500);
  }
}

export async function getNotifications(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await communityService.getNotifications(req.user.userId, limit, offset);
    return sendSuccess(res, notifications);
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return sendError(res, error.message || 'Failed to get notifications', 500);
  }
}

export async function getUnreadNotificationCount(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const count = await communityService.getUnreadNotificationCount(req.user.userId);
    return sendSuccess(res, { count });
  } catch (error: any) {
    console.error('Get unread notification count error:', error);
    return sendError(res, error.message || 'Failed to get unread notification count', 500);
  }
}

export async function markNotificationRead(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const notification = await communityService.markNotificationRead(req.user.userId, id);
    return sendSuccess(res, notification, 'Notification marked as read');
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    return sendError(res, error.message || 'Failed to mark notification as read', 500);
  }
}

export async function markAllNotificationsRead(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    await communityService.markAllNotificationsRead(req.user.userId);
    return sendSuccess(res, { success: true }, 'All notifications marked as read');
  } catch (error: any) {
    console.error('Mark all notifications read error:', error);
    return sendError(res, error.message || 'Failed to mark all notifications as read', 500);
  }
}

export async function getRingStats(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { date } = req.params;
    const stats = await communityService.getRingStats(req.user.userId, date);

    if (!stats) {
      return sendError(res, 'Ring stats not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, stats);
  } catch (error: any) {
    console.error('Get ring stats error:', error);
    return sendError(res, error.message || 'Failed to get ring stats', 500);
  }
}

export async function updateRingStats(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const stats = await communityService.updateRingStats(req.user.userId, req.body);
    return sendSuccess(res, stats, 'Ring stats updated successfully');
  } catch (error: any) {
    console.error('Update ring stats error:', error);
    return sendError(res, error.message || 'Failed to update ring stats', 500);
  }
}
