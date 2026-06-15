import Dexie, { type Table } from 'dexie';
import type { UserProfile, Friend, NodeProgress } from '../types';

export class TichiDB extends Dexie {
  profiles!: Table<UserProfile>;
  friends!: Table<Friend>;
  progress!: Table<NodeProgress>;

  constructor() {
    super('TichiDB');
    this.version(1).stores({
      profiles: 'id, username',
      friends: '[userId+friendId], userId, friendId',
      progress: '[nodeId+userId], userId, nodeId',
    });
  }
}

export const db = new TichiDB();
