import { Router } from 'express';
import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  getUserClans,
  getClan,
  createClan,
  updateClanDetails,
  inviteToClan,
  respondClanInvite,
  getClanInvites,
  leaveClan,
  removeClanMember,
  updateClanRole,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  getRingStats,
  updateRingStats,
} from '../controllers/community.controller';
import { requireAuth } from '../auth/middleware';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Friends
router.get('/friends', getFriends);
router.get('/friend-requests', getFriendRequests);
router.post('/friend-requests', sendFriendRequest);
router.post('/friend-requests/:fromUid/accept', acceptFriendRequest);
router.post('/friend-requests/:fromUid/reject', rejectFriendRequest);
router.delete('/friend-requests/:toUid', cancelFriendRequest);
router.delete('/friends/:friendUid', removeFriend);

// Block/Unblock
router.post('/block/:blockedUid', blockUser);
router.delete('/block/:blockedUid', unblockUser);

// Clans
router.get('/clans', getUserClans);
router.get('/clans/:id', getClan);
router.post('/clans', createClan);
router.put('/clans/:id', updateClanDetails);
router.post('/clans/:id/invite', inviteToClan);
router.post('/clans/:id/invites/:inviteId/respond', respondClanInvite);
router.get('/clans/invites', getClanInvites);
router.delete('/clans/:id/leave', leaveClan);
router.delete('/clans/:id/members/:memberUid', removeClanMember);
router.put('/clans/:id/members/:memberUid/role', updateClanRole);

// Notifications
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadNotificationCount);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/read-all', markAllNotificationsRead);

// Ring Stats
router.get('/ring-stats/:date', getRingStats);
router.put('/ring-stats', updateRingStats);

export default router;
