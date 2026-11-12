USE Hireu;

ALTER TABLE Egresado
  ADD COLUMN TokenRestablecimientoHash CHAR(64) NULL,
  ADD COLUMN TokenRestablecimientoExpira DATETIME NULL;