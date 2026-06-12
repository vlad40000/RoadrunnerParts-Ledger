import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const machines = pgTable("machines", {
  id: uuid("id").defaultRandom().primaryKey(),
  machineId: text("machine_id").notNull().unique(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  serial: text("serial").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const bomRows = pgTable("bom_rows", {
  id: uuid("id").defaultRandom().primaryKey(),
  machineId: text("machine_id").notNull().references(() => machines.machineId, { onDelete: "cascade" }),
  partNumber: text("part_number").notNull(),
  diagramId: text("diagram_id").notNull().default(""),
  description: text("description").notNull().default(""),
  encompassPrice: text("encompass_price").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const priceLookupAudit = pgTable("price_lookup_audit", {
  id: uuid("id").defaultRandom().primaryKey(),
  machineId: text("machine_id").notNull(),
  partNumber: text("part_number").notNull(),
  attemptedSource: text("attempted_source").notNull(),
  foundPrice: text("found_price"),
  success: text("success").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
