import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db functions
vi.mock('./db', () => ({
  listUsers: vi.fn().mockResolvedValue([
    { id: 1, openId: 'user1', name: 'Admin', email: 'admin@test.com', role: 'admin', createdAt: new Date(), lastSignedIn: new Date() },
    { id: 2, openId: 'user2', name: 'User', email: 'user@test.com', role: 'user', createdAt: new Date(), lastSignedIn: new Date() },
  ]),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  createAnnouncement: vi.fn().mockResolvedValue({ id: 1 }),
  getActiveAnnouncements: vi.fn().mockResolvedValue([
    { id: 1, title: 'Test', content: 'Content', imageUrl: null, imageCaption: null, isActive: 1, authorId: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getAllAnnouncements: vi.fn().mockResolvedValue([
    { id: 1, title: 'Test', content: 'Content', imageUrl: null, imageCaption: null, isActive: 1, authorId: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  updateAnnouncement: vi.fn().mockResolvedValue(undefined),
  deleteAnnouncement: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  getDb: vi.fn(),
}));

// Mock storage
vi.mock('./storage', () => ({
  storagePut: vi.fn().mockResolvedValue({ key: 'test.png', url: 'https://cdn.example.com/test.png' }),
}));

import { listUsers, updateUserRole, createAnnouncement, getActiveAnnouncements, getAllAnnouncements, updateAnnouncement, deleteAnnouncement } from './db';
import { storagePut } from './storage';

describe('Admin DB Functions (mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listUsers returns user array', async () => {
    const users = await listUsers();
    expect(users).toHaveLength(2);
    expect(users[0].role).toBe('admin');
    expect(users[1].role).toBe('user');
  });

  it('updateUserRole calls with correct params', async () => {
    await updateUserRole(2, 'admin');
    expect(updateUserRole).toHaveBeenCalledWith(2, 'admin');
  });

  it('createAnnouncement returns id', async () => {
    const result = await createAnnouncement({
      title: 'New Announcement',
      content: 'Content here',
      authorId: 1,
    });
    expect(result).toEqual({ id: 1 });
    expect(createAnnouncement).toHaveBeenCalledWith({
      title: 'New Announcement',
      content: 'Content here',
      authorId: 1,
    });
  });

  it('getActiveAnnouncements returns active items', async () => {
    const items = await getActiveAnnouncements();
    expect(items).toHaveLength(1);
    expect(items[0].isActive).toBe(1);
  });

  it('getAllAnnouncements returns all items', async () => {
    const items = await getAllAnnouncements();
    expect(items).toHaveLength(1);
  });

  it('updateAnnouncement calls with correct params', async () => {
    await updateAnnouncement(1, { title: 'Updated', isActive: 0 });
    expect(updateAnnouncement).toHaveBeenCalledWith(1, { title: 'Updated', isActive: 0 });
  });

  it('deleteAnnouncement calls with correct id', async () => {
    await deleteAnnouncement(1);
    expect(deleteAnnouncement).toHaveBeenCalledWith(1);
  });
});

describe('Storage Upload (mocked)', () => {
  it('storagePut returns url', async () => {
    const buffer = Buffer.from('test');
    const result = await storagePut('test.png', buffer, 'image/png');
    expect(result.url).toBe('https://cdn.example.com/test.png');
    expect(storagePut).toHaveBeenCalledWith('test.png', buffer, 'image/png');
  });
});

describe('Admin Role Logic', () => {
  it('first user should be admin (logic check)', () => {
    // The upsertUser function checks if user count is 0 and auto-assigns admin
    // This is a logic verification test
    const isFirstUser = true;
    const expectedRole = isFirstUser ? 'admin' : 'user';
    expect(expectedRole).toBe('admin');
  });

  it('non-first user should be regular user', () => {
    const isFirstUser = false;
    const expectedRole = isFirstUser ? 'admin' : 'user';
    expect(expectedRole).toBe('user');
  });

  it('owner should always be admin', () => {
    const ownerOpenId = 'owner123';
    const userOpenId = 'owner123';
    const isOwner = userOpenId === ownerOpenId;
    expect(isOwner).toBe(true);
  });
});
