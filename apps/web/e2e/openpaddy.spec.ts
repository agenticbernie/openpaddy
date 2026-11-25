import { expect, test } from '@playwright/test';

const API_URL = 'http://127.0.0.1:8787';

// Minimal valid 1x1 JPEG bytes for photo upload E2E test
const MINIMAL_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08,
  0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a,
  0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d,
  0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20, 0x22,
  0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34,
  0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0,
  0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4,
  0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
  0x7f, 0x9f, 0xff, 0xd9,
]);

test('OpenPaddy E2E: login -> create contract -> check-in -> generate dossier -> download PDF', async ({
  page,
  request,
}) => {
  // Seed local D1 database
  const seedRes = await request.post(`${API_URL}/api/dev/seed`);
  expect(seedRes.ok()).toBe(true);

  // 1. Login flow
  await page.goto('/login');
  await expect(
    page.getByRole('heading', { name: 'Đăng nhập hệ thống' }),
  ).toBeVisible();

  await page.getByLabel('Tên đăng nhập').fill('admin');
  await page.getByLabel('Mật khẩu').fill('openpaddy2027');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(
    page.getByRole('heading', { name: 'Tổng quan thu hoạch & tuân thủ' }),
  ).toBeVisible();

  // 2. Create contract flow
  await page.getByRole('link', { name: 'Hợp đồng' }).click();
  await expect(page).toHaveURL(/\/contracts/);

  await page.getByRole('button', { name: 'Tạo hợp đồng' }).click();
  await page.getByLabel('Mã Hợp tác xã (HTX)').fill('htx-e2e-can-tho');
  await page
    .getByRole('button', {
      name: 'Tùy chọn nâng cao: Tạo kèm thửa ruộng mẫu Cần Thơ',
    })
    .click();
  await page.getByRole('button', { name: 'Lưu & phát hành hợp đồng' }).click();

  await expect(page.getByText('htx-e2e-can-tho').first()).toBeVisible();

  // 3. Compliance check-in flow (select parcel thua-tl-03 which only has 1 awd_drain)
  await page.getByRole('link', { name: 'Check-in' }).click();
  await expect(page).toHaveURL(/\/check-in/);

  const parcelSelect = page.getByLabel('Thửa ruộng');
  await parcelSelect.selectOption('thua-tl-03');
  await page.getByLabel('Hạng mục tuân thủ').selectOption('awd_drain');

  await expect(page.getByText(/✓ Vị trí khớp/)).toBeVisible();

  await page.setInputFiles('input[type="file"]', {
    name: 'field-awd.jpg',
    mimeType: 'image/jpeg',
    buffer: MINIMAL_JPEG,
  });

  await expect(page.getByAltText('Xem trước ảnh check-in')).toBeVisible();
  await page.getByRole('button', { name: 'Gửi check-in tuân thủ' }).click();
  await expect(page.getByText('Check-in thành công!')).toBeVisible();

  // 4. Dashboard -> Generate Green Dossier & download PDF
  await page.getByRole('link', { name: 'Tổng quan' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Tạo dossier/ }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^OpenPaddy-Dossier-.*\.pdf$/);
  await expect(
    page.getByText(/Đã tạo & tải xuống Green Dossier/),
  ).toBeVisible();
});
