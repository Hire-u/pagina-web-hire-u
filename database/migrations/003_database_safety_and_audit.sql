-- Ejecuta esta migración sobre la base Hire-U después de la 002.
-- Conserva sesiones existentes y no modifica los perfiles.

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB;

CREATE INDEX idx_egresado_correo_normalizado
  ON Egresado ((LOWER(CorreoInstitucional)));

CREATE INDEX idx_egresado_token_restauracion
  ON Egresado (TokenRestablecimientoHash);

CREATE OR REPLACE VIEW EgresadoDatosBasicos AS
SELECT
  EgresadoId,
  Nombre,
  Apellido,
  CorreoInstitucional,
  ProgramaAcademico,
  AnioGraduacion,
  PerfilProfesional
FROM Egresado;
