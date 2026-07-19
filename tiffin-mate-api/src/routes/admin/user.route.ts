import { Router } from "express";
import { AdminUserController } from "../../cotrollers/admin/user.controller";
import { authorizedMiddelWare, adminMiddleware } from "../../middlewares/authorized.middleware";

const router:Router=Router();
const adminUserController= new AdminUserController();

// Every admin route requires both an authenticated session AND the admin
// role (OWASP A01:2021 Broken Access Control). POST '/' previously only
// checked authorizedMiddelWare, meaning any logged-in non-admin user could
// call this "admin create user" endpoint - a real broken-access-control bug
// found during the initial audit, confirmed by the regression test in
// admin.integration.test.ts ("rejects non-admin creating a user via POST").
router.use(authorizedMiddelWare, adminMiddleware);

router.post('/', adminUserController.createUser);
router.get('/', adminUserController.getUsers);
router.get('/:id', adminUserController.getUser);
router.put('/:id', adminUserController.updateUser);
router.delete('/:id', adminUserController.deleteUser);

export default router;