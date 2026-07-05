/* eslint-env vitest */
import { describe, expect, test, vi } from 'vitest';
import ExcelJS from 'exceljs';
import { uploadCustomerRecordsFromFile } from '../utils/excel-upload.js';

vi.mock('../api/memberId-counter', () => {
  let nextId = 1000;
  return { getNextId: vi.fn(async () => nextId++) };
});

/**
 * Builds a fake browser File from spreadsheet rows.
 * Each row is [name, idPart1, idPart2, car].
 */
async function buildExcelFile(rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Members');
  worksheet.addRow(['Name', 'Plan', 'ID', 'Car']);
  rows.forEach((row) => worksheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return { arrayBuffer: async () => buffer };
}

function buildMockCrud(overrides = {}) {
  return {
    createMemberWithMonthlyPass: vi.fn(async (userId) => userId),
    updateMember: vi.fn(async (id) => id),
    updateMembership: vi.fn(async (id, passId) => passId),
    getMemberByMonthlyPassId: vi.fn(async () => null),
    deleteMember: vi.fn(async (id) => id),
    ...overrides,
  };
}

describe('uploadCustomerRecordsFromFile', () => {
  test('creates one member per unique pass ID', async () => {
    const file = await buildExcelFile([
      ['Alice', 'A', '101', 'Toyota'],
      ['Bob', 'B', '202', 'Honda'],
    ]);
    const crud = buildMockCrud();

    const results = await uploadCustomerRecordsFromFile(file, crud);

    expect(results.total).toBe(2);
    expect(results.successful).toBe(2);
    expect(results.failed).toBe(0);
    expect(results.duplicates).toBe(0);
    expect(crud.createMemberWithMonthlyPass).toHaveBeenCalledTimes(2);
  });

  test('applies rows sharing a pass ID in order so the last row wins instead of racing', async () => {
    const file = await buildExcelFile([
      ['Old Member', 'A', '101', 'Toyota'],
      ['New Member', 'A', '101', 'Mazda'],
      ['Bob', 'B', '202', 'Honda'],
    ]);

    // Stateful mocks: once a pass is created, later lookups find it.
    const created = new Map();
    const crud = buildMockCrud({
      createMemberWithMonthlyPass: vi.fn(async (userId, passId) => {
        created.set(passId, userId);
        return userId;
      }),
      getMemberByMonthlyPassId: vi.fn(async (passId) =>
        created.has(passId) ? { id: created.get(passId), notes: '' } : null
      ),
    });

    const results = await uploadCustomerRecordsFromFile(file, crud);

    expect(results.total).toBe(3);
    expect(results.successful).toBe(3);
    expect(results.failed).toBe(0);
    expect(results.duplicates).toBe(1);
    expect(results.warnings).toHaveLength(1);
    expect(results.warnings[0].warning).toContain('A101');
    expect(results.warnings[0].warning).toContain('2, 3');

    // Each unique pass ID is created exactly once; the later duplicate row
    // becomes an update with its own (winning) data.
    const createdPassIds = crud.createMemberWithMonthlyPass.mock.calls.map((call) => call[1]);
    expect(createdPassIds.sort()).toEqual(['A101', 'B202']);
    expect(crud.updateMember).toHaveBeenCalledWith(created.get('A101'), { name: 'New Member' });
    expect(crud.updateMembership).toHaveBeenCalledWith(created.get('A101'), 'A101', expect.objectContaining({
      vehicle: 'Mazda',
    }));
  });

  test('duplicate rows do not block pruning of stale members', async () => {
    const file = await buildExcelFile([
      ['Alice', 'A', '101', 'Toyota'],
      ['Alice again', 'A', '101', 'Toyota'],
    ]);
    const crud = buildMockCrud();

    const results = await uploadCustomerRecordsFromFile(file, {
      ...crud,
      existingMemberIds: ['stale-member'],
    });

    expect(results.failed).toBe(0);
    expect(results.pruned).toBe(1);
    expect(crud.deleteMember).toHaveBeenCalledWith('stale-member');
  });

  test('updates instead of creating when the pass ID already exists', async () => {
    const file = await buildExcelFile([['Alice', 'A', '101', 'Toyota']]);
    const crud = buildMockCrud({
      getMemberByMonthlyPassId: vi.fn(async () => ({ id: 'user-1', notes: 'keep me' })),
    });

    const results = await uploadCustomerRecordsFromFile(file, crud);

    expect(results.successful).toBe(1);
    expect(crud.createMemberWithMonthlyPass).not.toHaveBeenCalled();
    expect(crud.updateMember).toHaveBeenCalledWith('user-1', { name: 'Alice' });
    expect(crud.updateMembership).toHaveBeenCalledWith('user-1', 'A101', expect.objectContaining({
      notes: 'keep me',
    }));
  });
});
