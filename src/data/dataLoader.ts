import data from "../../public/data.json";

export interface Item {
  id: string;
  name: string;
  category: string;
  stack?: number;
}

export interface Recipe {
  id: string;
  name: string;
  producers: string[];
  time: number;
  in: Record<string, number | undefined>;
  out: Record<string, number | undefined>;
}

export interface DataStructure {
  items: Item[];
  recipes: Recipe[];
}

export const loadData = (): DataStructure => {
  return {
    items: data.items as Item[],
    recipes: data.recipes as Recipe[],
  };
};
