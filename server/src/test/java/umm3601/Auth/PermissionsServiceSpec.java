package umm3601.Auth;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

import io.javalin.http.BadRequestResponse;

@SuppressWarnings({ "MagicNumber" })
class PermissionsServiceSpec {

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  private PermissionsService permissionsService;

  @BeforeAll
  static void setupAll() {
    String mongoAddr = System.getenv().getOrDefault("MONGO_ADDR", "localhost");
    mongoClient = MongoClients.create(
        MongoClientSettings.builder()
            .applyToClusterSettings(builder -> builder.hosts(Arrays.asList(new ServerAddress(mongoAddr))))
            .build());
    db = mongoClient.getDatabase("test");
  }

  @AfterAll
  static void teardownAll() {
    db.drop();
    mongoClient.close();
  }

  @BeforeEach
  void setupEach() {
    db.getCollection("permissions").drop();
    permissionsService = new PermissionsService(db);
  }

  @Test
  void getPermissionsBootstrapsDefaultDocument() {
    RolePermissions perms = permissionsService.getPermissions();

    assertEquals("role-permissions", perms._id);
    assertTrue(perms.roles.containsKey("volunteer_base"));
  }

  @Test
  void getPermissionsRepairsExistingVolunteerBaseWhenFieldsAreMissing() {
    db.getCollection("permissions").insertOne(new org.bson.Document()
        .append("_id", "role-permissions")
        .append("roles", new org.bson.Document()
            .append("volunteer_base", new org.bson.Document()
                .append("permissions", null)
                .append("inherits", null))));

    RolePermissions perms = permissionsService.getPermissions();

    assertNotNull(perms.roles.get("volunteer_base").permissions);
    assertEquals(List.of(), perms.roles.get("volunteer_base").permissions);
    assertEquals(List.of(), perms.roles.get("volunteer_base").inherits);
  }

  @Test
  void getPermissionsBootstrapsWhenRolesMapIsMissingOrLacksVolunteerBase() {
    db.getCollection("permissions").insertOne(new org.bson.Document()
        .append("_id", "role-permissions")
        .append("roles", null));

    RolePermissions missingRoles = permissionsService.getPermissions();

    assertTrue(missingRoles.roles.containsKey("volunteer_base"));

    db.getCollection("permissions").drop();
    permissionsService = new PermissionsService(db);
    db.getCollection("permissions").insertOne(new org.bson.Document()
        .append("_id", "role-permissions")
        .append("roles", new org.bson.Document()
            .append("frontdesk", new org.bson.Document()
                .append("permissions", List.of("basic_access"))
                .append("inherits", List.of()))));

    RolePermissions missingVolunteerBase = permissionsService.getPermissions();

    assertTrue(missingVolunteerBase.roles.containsKey("volunteer_base"));
  }

  @Test
  void getPermissionsCleansVolunteerBasePermissionsAndInheritance() {
    db.getCollection("permissions").insertOne(new org.bson.Document()
        .append("_id", "role-permissions")
        .append("roles", new org.bson.Document()
            .append("volunteer_base", new org.bson.Document()
                .append("permissions", Arrays.asList("basic_access", null, "", "basic_access"))
                .append("inherits", Arrays.asList(null, "", "volunteer_base", "frontdesk")))));

    RolePermissions perms = permissionsService.getPermissions();

    assertEquals(List.of("basic_access"), perms.roles.get("volunteer_base").permissions);
    assertEquals(List.of("frontdesk"), perms.roles.get("volunteer_base").inherits);
  }

  @Test
  void getPermissionsRepairsVolunteerBaseSelfInheritance() {
    db.getCollection("permissions").insertOne(new org.bson.Document()
        .append("_id", "role-permissions")
        .append("roles", new org.bson.Document()
            .append("volunteer_base", new org.bson.Document()
                .append("permissions", List.of("basic_access"))
                .append("inherits", List.of("volunteer_base")))));

    RolePermissions perms = permissionsService.getPermissions();

    assertEquals(List.of(), perms.roles.get("volunteer_base").inherits);
  }

  @Test
  void getEffectivePermissionsIncludesInheritedPermissions() {
    RoleConfig config = new RoleConfig();
    config.permissions = List.of("manage_new_project");
    config.inherits = List.of("volunteer_base");
    permissionsService.updateRole("project_manager", config);

    Set<String> effective = permissionsService.getEffectivePermissions("project_manager");

    assertTrue(effective.contains("manage_new_project"));
  }

  @Test
  void getPermissionsForRoleReturnsEmptyForMissingRole() {
    List<String> perms = permissionsService.getPermissionsForRole("missing");

    assertEquals(List.of(), perms);
  }

  @Test
  void getEffectivePermissionsReturnsEmptyForNullOrBlankRole() {
    assertEquals(Set.of(), permissionsService.getEffectivePermissions(null));
    assertEquals(Set.of(), permissionsService.getEffectivePermissions("   "));
  }

  @Test
  void updateDeleteAndRoleExistsWork() {
    RoleConfig config = new RoleConfig();
    config.permissions = List.of("manage_new_project");
    config.inherits = List.of("volunteer_base");

    permissionsService.updateRole("frontdesk", config);
    assertTrue(permissionsService.roleExists("frontdesk"));

    permissionsService.deleteRole("frontdesk");
    assertFalse(permissionsService.roleExists("frontdesk"));
  }

  @Test
  void updateRoleRejectsVolunteerBaseSelfInheritance() {
    RoleConfig config = new RoleConfig();
    config.permissions = List.of("basic_access");
    config.inherits = List.of("volunteer_base");

    assertThrows(BadRequestResponse.class, () -> permissionsService.updateRole("volunteer_base", config));
  }

  @Test
  void updateRoleRejectsInvalidConfigsAndParents() {
    assertThrows(BadRequestResponse.class, () -> permissionsService.updateRole("frontdesk", null));

    RoleConfig duplicateParents = new RoleConfig();
    duplicateParents.permissions = List.of("basic_access");
    duplicateParents.inherits = List.of("volunteer_base", "volunteer_base");
    assertThrows(BadRequestResponse.class, () -> permissionsService.updateRole("frontdesk", duplicateParents));

    RoleConfig blankParent = new RoleConfig();
    blankParent.permissions = List.of("basic_access");
    blankParent.inherits = List.of(" ");
    assertThrows(BadRequestResponse.class, () -> permissionsService.updateRole("frontdesk", blankParent));

    RoleConfig selfParent = new RoleConfig();
    selfParent.permissions = List.of("basic_access");
    selfParent.inherits = List.of("frontdesk");
    assertThrows(BadRequestResponse.class, () -> permissionsService.updateRole("frontdesk", selfParent));

    RoleConfig missingParent = new RoleConfig();
    missingParent.permissions = List.of("basic_access");
    missingParent.inherits = List.of("missing");
    assertThrows(BadRequestResponse.class, () -> permissionsService.updateRole("frontdesk", missingParent));
  }

  @Test
  void updateRoleRejectsInheritanceCycles() {
    RoleConfig initialProjectManager = new RoleConfig();
    initialProjectManager.permissions = List.of("manage_new_project");
    initialProjectManager.inherits = List.of("volunteer_base");
    permissionsService.updateRole("project_manager", initialProjectManager);

    RoleConfig supportHelper = new RoleConfig();
    supportHelper.permissions = List.of("basic_access");
    supportHelper.inherits = List.of("project_manager");
    permissionsService.updateRole("support_helper", supportHelper);

    RoleConfig cyclicProjectManager = new RoleConfig();
    cyclicProjectManager.permissions = List.of("manage_new_project");
    cyclicProjectManager.inherits = List.of("support_helper");

    assertThrows(BadRequestResponse.class,
      () -> permissionsService.updateRole("project_manager", cyclicProjectManager));
  }

  @Test
  void getAvailablePermissionsIncludesAnnotatedRoutes() {
    List<String> permissions = permissionsService.getAvailablePermissions();

    assertTrue(permissions.isEmpty());
    assertFalse(permissions.contains("not_a_real_permission"));
  }

  @Test
  void getPermissionCatalogStartsEmpty() {
    List<PermissionsService.PermissionCatalogEntry> catalog = permissionsService.getPermissionCatalog();

    assertTrue(catalog.isEmpty());
  }

  @Test
  void getPermissionsKeepsVolunteerBaseReadyForFuturePermissions() {
    RolePermissions permissions = permissionsService.getPermissions();

    assertEquals(List.of(), permissions.roles.get("volunteer_base").permissions);
    assertEquals(List.of(), permissions.roles.get("volunteer_base").inherits);
  }
}
