import { storage } from "../storage";
import type { InsertUser } from "@shared/schema";

export class UserRepository {
  getById(id: string) {
    return storage.getUser(id);
  }

  list() {
    return storage.getUsers();
  }

  getByUsername(username: string) {
    return storage.getUserByUsername(username);
  }

  create(user: InsertUser) {
    return storage.createUser(user);
  }
}

export const userRepository = new UserRepository();
