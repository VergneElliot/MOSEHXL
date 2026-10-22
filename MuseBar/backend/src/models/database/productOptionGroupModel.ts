import {
  getAllActive,
  getAssignmentsForProducts,
  getById,
} from './productOptionGroupReads';
import {
  create,
  deleteProductOptionGroup,
  setProductAssignments,
  update,
} from './productOptionGroupWrites';

export type {
  CreateProductOptionGroupInput,
  ProductOptionChoice,
  ProductOptionGroup,
  UpdateProductOptionGroupInput,
} from './productOptionGroupTypes';

export const ProductOptionGroupModel = {
  getAllActive,
  getById,
  create,
  update,
  delete: deleteProductOptionGroup,
  getAssignmentsForProducts,
  setProductAssignments,
};
