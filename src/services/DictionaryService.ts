/**
 * @file Barrel re-export — deleguje do serwisów domenowych w `src/services/dictionary/`.
 *
 * Wszystkie 43+ miejsca używają `await import("@/services/DictionaryService")`,
 * dlatego zachowujemy klasę `DictionaryService` z tymi samymi statycznymi metodami.
 */

import { CategoryService } from '@/services/dictionary/CategoryService';
import { MaterialService } from '@/services/dictionary/MaterialService';
import { MaterialCategoryService } from '@/services/dictionary/MaterialCategoryService';
import { CustomerService } from '@/services/dictionary/CustomerService';
import { ResourceService } from '@/services/dictionary/ResourceService';
import { SettingsService } from '@/services/dictionary/SettingsService';

export class DictionaryService {
  // --- KATEGORIE ZASOBÓW ---
  static getCategories = CategoryService.getCategories;
  static mergeResourceFormVisibility = CategoryService.mergeResourceFormVisibility;
  static getResourceCategoryById = CategoryService.getResourceCategoryById;
  static addCategory = CategoryService.addCategory;
  static updateCategory = CategoryService.updateCategory;
  static deleteCategory = CategoryService.deleteCategory;

  // --- MATERIAŁY ---
  static getMaterials = MaterialService.getMaterials;
  static addMaterial = MaterialService.addMaterial;
  static updateMaterial = MaterialService.updateMaterial;
  static deleteMaterial = MaterialService.deleteMaterial;

  // --- KATEGORIE MATERIAŁÓW ---
  static getMaterialCategories = MaterialCategoryService.getMaterialCategories;
  static addMaterialCategory = MaterialCategoryService.addMaterialCategory;
  static updateMaterialCategory = MaterialCategoryService.updateMaterialCategory;
  static deleteMaterialCategory = MaterialCategoryService.deleteMaterialCategory;

  // --- KLIENCI ---
  static getCustomers = CustomerService.getCustomers;
  static addCustomer = CustomerService.addCustomer;
  static updateCustomer = CustomerService.updateCustomer;
  static deleteCustomer = CustomerService.deleteCustomer;

  // --- ZASOBY (maszyny) ---
  static getResources = ResourceService.getResources;
  static addResource = ResourceService.addResource;
  static updateResource = ResourceService.updateResource;
  static deleteResource = ResourceService.deleteResource;

  // --- USTAWIENIA FIRMY ---
  static getSettings = SettingsService.getSettings;
  static updateSettings = SettingsService.updateSettings;
}

export { CategoryHierarchyError } from '@/services/categoryHierarchyValidation';

/** Payload aktualizacji kategorii zasobów — do importu w Route Handlers bez `@/db/schema`. */
export type { ResourceCategoryUpdateInput } from '@/services/dictionary/CategoryService';

/** Payload aktualizacji kategorii materiałów — bez importu schematu w kontrolerze. */
export type { MaterialCategoryUpdateInput } from '@/services/dictionary/MaterialCategoryService';
