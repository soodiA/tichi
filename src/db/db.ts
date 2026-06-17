import Dexie, { type Table } from 'dexie';
import type { UserProfile, Friend, NodeProgress, Unit, Node, Question } from '../types';

export class TichiDB extends Dexie {
  profiles!: Table<UserProfile>;
  friends!: Table<Friend>;
  progress!: Table<NodeProgress>;
  units!: Table<Unit>;
  nodes!: Table<Node>;
  questions!: Table<Question & { nodeId: string }>;

  constructor() {
    super('TichiDB');
    this.version(1).stores({
      profiles: 'id, username',
      friends: '[userId+friendId], userId, friendId',
      progress: '[nodeId+userId], userId, nodeId',
    });
    this.version(2).stores({
      profiles: 'id, username',
      friends: '[userId+friendId], userId, friendId',
      progress: '[nodeId+userId], userId, nodeId',
      units: 'id, order',
      nodes: 'id, unitId, order',
      questions: 'id, nodeId, order',
    });
  }
}

export const db = new TichiDB();
