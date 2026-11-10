USE Hireu;

-- Revisa que no existan correos duplicados antes de agregar el indice unico.
-- SELECT LOWER(CorreoInstitucional), COUNT(*)
-- FROM Egresado
-- WHERE CorreoInstitucional IS NOT NULL
-- GROUP BY LOWER(CorreoInstitucional)
-- HAVING COUNT(*) > 1;

ALTER TABLE Egresado
  ADD COLUMN ContrasenaHash VARCHAR(60) NULL AFTER CorreoInstitucional;

CREATE UNIQUE INDEX uq_egresado_correo_institucional
  ON Egresado (CorreoInstitucional);