CREATE TABLE IF NOT EXISTS "material_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"color" varchar(50) DEFAULT '#3f3f46'
);

CREATE TABLE IF NOT EXISTS "material_to_categories" (
	"material_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "material_to_categories_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "material_to_categories_category_id_material_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."material_categories"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "material_to_categories_material_id_category_id_pk" PRIMARY KEY("material_id","category_id")
);
