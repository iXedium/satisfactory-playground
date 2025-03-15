import data from "../../public/data.json";
export const loadData = () => {
    return {
        items: [...data.items].sort((a, b) => a.name.localeCompare(b.name)), // Sort once
        recipes: data.recipes,
    };
};
