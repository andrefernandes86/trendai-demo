import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Utensils,
  Brain,
  Calculator,
  FileText,
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface MealAnalysis {
  confidence: number;
  userInformation?: string; // What the user actually said
  identifiedMeal?: string; // Generic meal name extracted
  understoodItems: string[];
  mealBreakdown: string;
  searchTerms?: string[]; // Added for searchable terms
  suggestedItems: Array<{
    name: string;
    quantity: number;
    unit: string;
    description: string;
    quantityDescription?: string; // Detailed quantity description
    searchTerms?: string[]; // Added for searchable terms
    brand?: string; // Added for brand information
    category?: string; // Added for food category
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    nutriScore?: string;
    foodType?: string;
    ingredients?: string[];
    allergens?: string[];
    additives?: string[];
  }>;
  totalCalories?: number;
  totalCarbs?: number;
  totalProtein?: number;
  totalFat?: number;
  totalFiber?: number;
  totalSugar?: number;
}

interface AddMealWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  onMealAdded: () => void;
}

const AddMealWorkflow: React.FC<AddMealWorkflowProps> = ({ isOpen, onClose, onMealAdded }) => {
  const { nutritionAxios, aiAxios } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [mealDescription, setMealDescription] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<MealAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [detailedAnalysis, setDetailedAnalysis] = useState<any>(null);
  const [comments, setComments] = useState('');
  const [securityBlocked, setSecurityBlocked] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [showSecurityBanner, setShowSecurityBanner] = useState(false);
  const [securityDetails, setSecurityDetails] = useState<any>(null);
  const [openFoodFactsStatus, setOpenFoodFactsStatus] = useState<'checking' | 'updating' | 'ready' | 'error'>('checking');

  // Multilingual food translation function
  const translateFoodToEnglish = (foodName: string): string => {
    const lowerName = foodName.toLowerCase();
    
    // Portuguese to English food mappings
    const portugueseFoodMap: { [key: string]: string } = {
      'arroz': 'rice', 'feijão': 'beans', 'feijao': 'beans', 'frango': 'chicken', 'carne': 'beef',
      'porco': 'pork', 'peixe': 'fish', 'camarão': 'shrimp', 'camarao': 'shrimp', 'batata': 'potato',
      'batatas': 'potatoes', 'batata frita': 'french fries', 'batatas fritas': 'french fries',
      'salada': 'salad', 'pão': 'bread', 'pao': 'bread', 'queijo': 'cheese', 'leite': 'milk',
      'ovos': 'eggs', 'ovo': 'egg', 'macarrão': 'pasta', 'macarrao': 'pasta', 'espaguete': 'spaghetti',
      'lasanha': 'lasagna', 'sopa': 'soup', 'suco': 'juice', 'refrigerante': 'soda', 'coca': 'coke',
      'cerveja': 'beer', 'vinho': 'wine', 'água': 'water', 'agua': 'water', 'café': 'coffee',
      'cafe': 'coffee', 'chá': 'tea', 'cha': 'tea', 'maçã': 'apple', 'maca': 'apple',
      'banana': 'banana', 'laranja': 'orange', 'uva': 'grape', 'morango': 'strawberry',
      'morangos': 'strawberries', 'abacaxi': 'pineapple', 'manga': 'mango', 'abacate': 'avocado',
      'tomate': 'tomato', 'cebola': 'onion', 'alho': 'garlic', 'cenoura': 'carrot',
      'cenouras': 'carrots', 'brócolis': 'broccoli', 'brocolis': 'broccoli', 'espinafre': 'spinach',
      'alface': 'lettuce', 'pepino': 'cucumber', 'azeite': 'olive oil', 'manteiga': 'butter',
      'creme': 'cream', 'iogurte': 'yogurt', 'presunto': 'ham', 'salsicha': 'sausage',
      'linguiça': 'sausage', 'linguica': 'sausage', 'bacon': 'bacon', 'mortadela': 'bologna',
      'salame': 'salami', 'pepperoni': 'pepperoni', 'calabresa': 'calabrese', 'mussarela': 'mozzarella',
      'parmesão': 'parmesan', 'parmesao': 'parmesan', 'gorgonzola': 'gorgonzola', 'provolone': 'provolone',
      'ricota': 'ricotta', 'cottage': 'cottage cheese', 'farofa': 'cassava flour', 'mandioca': 'cassava',
      'aipim': 'cassava', 'inhame': 'yam', 'batata doce': 'sweet potato', 'batata-doce': 'sweet potato',
      'milho': 'corn', 'ervilha': 'pea', 'ervilhas': 'peas', 'lentilha': 'lentil', 'lentilhas': 'lentils',
      'grão de bico': 'chickpea', 'grao de bico': 'chickpea', 'grãos de bico': 'chickpeas',
      'graos de bico': 'chickpeas', 'quinoa': 'quinoa', 'aveia': 'oatmeal', 'granola': 'granola',
      'cereal': 'cereal', 'pão de queijo': 'cheese bread', 'pao de queijo': 'cheese bread',
      'coxinha': 'chicken croquette', 'pastel': 'pastry', 'empada': 'pie', 'esfiha': 'meat pie',
      'kibe': 'kibbeh', 'quibe': 'kibbeh', 'acarajé': 'black eyed pea fritter', 'acaraje': 'black eyed pea fritter',
      'moqueca': 'fish stew', 'vatapá': 'shrimp stew', 'vatapa': 'shrimp stew', 'caruru': 'okra stew',
      'bobó': 'cassava stew', 'bobo': 'cassava stew', 'feijoada': 'black bean stew', 'churrasco': 'barbecue',
      'churrascaria': 'barbecue restaurant', 'rodízio': 'all you can eat', 'rodizio': 'all you can eat',
      'self service': 'buffet', 'self-service': 'buffet', 'prato feito': 'plate lunch', 'prato-feito': 'plate lunch',
      'marmita': 'packed lunch', 'quentinha': 'packed lunch', 'lanche': 'snack', 'sobremesa': 'dessert',
      'doce': 'sweet', 'bolo': 'cake', 'torta': 'pie', 'pudim': 'pudding', 'sorvete': 'ice cream',
      'chocolate': 'chocolate', 'bombom': 'chocolate bonbon', 'brigadeiro': 'chocolate truffle',
      'beijinho': 'coconut truffle', 'quindim': 'coconut custard', 'cocada': 'coconut candy',
      'paçoca': 'peanut candy', 'pacoca': 'peanut candy', 'rapadura': 'brown sugar', 'açúcar': 'sugar',
      'acucar': 'sugar', 'mel': 'honey', 'geleia': 'jam', 'geleia de morango': 'strawberry jam',
      'geleia de morangos': 'strawberry jam', 'manteiga de amendoim': 'peanut butter',
      'pasta de amendoim': 'peanut butter', 'creme de avelã': 'hazelnut spread', 'creme de avela': 'hazelnut spread',
      'nutella': 'nutella', 'goiabada': 'guava paste', 'doce de leite': 'dulce de leche',
      'doce de leite condensado': 'condensed milk', 'leite condensado': 'condensed milk',
      'creme de leite': 'heavy cream', 'nata': 'cream', 'queijo ralado': 'grated cheese',
      'queijo parmesão': 'parmesan cheese', 'queijo parmesao': 'parmesan cheese', 'queijo mussarela': 'mozzarella cheese',
      'queijo gorgonzola': 'gorgonzola cheese', 'queijo provolone': 'provolone cheese', 'queijo ricota': 'ricotta cheese',
      'queijo cottage': 'cottage cheese', 'queijo minas': 'minas cheese', 'queijo coalho': 'coalho cheese',
      'queijo canastra': 'canastra cheese', 'queijo do reino': 'king cheese', 'queijo prato': 'prato cheese',
      'queijo branco': 'white cheese', 'queijo amarelo': 'yellow cheese', 'queijo fresco': 'fresh cheese',
      'queijo curado': 'aged cheese', 'queijo maturado': 'aged cheese', 'queijo defumado': 'smoked cheese',
      'queijo fundido': 'melted cheese', 'queijo derretido': 'melted cheese', 'queijo em pedaços': 'cheese chunks',
      'queijo em pedacos': 'cheese chunks', 'queijo em fatias': 'sliced cheese', 'queijo em cubos': 'cubed cheese',
      'queijo em tiras': 'cheese strips', 'queijo em pó': 'powdered cheese', 'queijo em po': 'powdered cheese',
      'queijo em creme': 'cream cheese', 'queijo em pasta': 'cheese spread', 'queijo em barra': 'cheese bar',
      'queijo em rolo': 'cheese roll', 'queijo em bola': 'cheese ball', 'queijo em cone': 'cheese cone',
      'queijo em tubo': 'cheese tube', 'queijo em lata': 'canned cheese', 'queijo em vidro': 'jarred cheese',
      'queijo em sachê': 'cheese packet', 'queijo em sache': 'cheese packet', 'queijo em envelope': 'cheese envelope',
      'queijo em blister': 'cheese blister', 'queijo em bandeja': 'cheese tray', 'queijo em caixa': 'cheese box',
      'queijo em saco': 'cheese bag', 'queijo em pote': 'cheese pot', 'queijo em copo': 'cheese cup',
      'queijo em tigela': 'cheese bowl', 'queijo em prato': 'cheese plate', 'queijo em taça': 'cheese glass',
      'queijo em xícara': 'cheese cup', 'queijo em xicara': 'cheese cup', 'queijo em colher': 'cheese spoon',
      'queijo em garfo': 'cheese fork', 'queijo em faca': 'cheese knife', 'queijo em palito': 'cheese stick',
      'queijo em cubinho': 'cheese cube', 'queijo em fatia': 'cheese slice', 'queijo em pedaço': 'cheese piece',
      'queijo em pedaco': 'cheese piece', 'queijo em tira': 'cheese strip', 'pizza': 'pizza',
      'pizza calabresa': 'calabrese pizza', 'pizza margherita': 'margherita pizza', 'pizza pepperoni': 'pepperoni pizza',
      'pizza 4 queijos': '4 cheese pizza', 'pizza 4 queijo': '4 cheese pizza', 'pizza quatro queijos': '4 cheese pizza',
      'pizza quatro queijo': '4 cheese pizza', 'pizza de calabresa': 'calabrese pizza', 'pizza de margherita': 'margherita pizza',
      'pizza de pepperoni': 'pepperoni pizza', 'pizza de 4 queijos': '4 cheese pizza', 'pizza de 4 queijo': '4 cheese pizza',
      'pizza de quatro queijos': '4 cheese pizza', 'pizza de quatro queijo': '4 cheese pizza'
    };

    // Check for exact matches first
    for (const [portuguese, english] of Object.entries(portugueseFoodMap)) {
      if (lowerName.includes(portuguese)) {
        return english;
      }
    }

    // Check for partial matches
    for (const [portuguese, english] of Object.entries(portugueseFoodMap)) {
      if (portuguese.includes(lowerName) || lowerName.includes(portuguese)) {
        return english;
      }
    }

    // If no translation found, return original
    return foodName;
  };

  // Function to get nutritional data for food items
  const getNutritionalDataForItem = (foodName: string) => {
    // First translate Portuguese to English
    const translatedName = translateFoodToEnglish(foodName);
    const lowerName = translatedName.toLowerCase();
    
    // Big Mac components
    if (lowerName.includes('big mac') || lowerName.includes('burger')) {
      return {
        calories: 550,
        carbs: 45,
        protein: 25,
        fat: 30,
        saturatedFat: 12,
        fiber: 3,
        sugar: 9,
        sodium: 970,
        cholesterol: 80,
        potassium: 400,
        nutriScore: 'D',
        foodType: 'Ultra-processed',
        ingredients: ['beef', 'bun', 'lettuce', 'cheese', 'pickles', 'onions', 'special sauce'],
        allergens: ['gluten', 'dairy'],
        additives: ['preservatives', 'flavor enhancers']
      };
    }
    
    if (lowerName.includes('fries') || lowerName.includes('french fries')) {
      return {
        calories: 365,
        carbs: 63,
        protein: 4,
        fat: 17,
        saturatedFat: 3,
        fiber: 4,
        sugar: 0,
        sodium: 245,
        cholesterol: 0,
        potassium: 925,
        nutriScore: 'C',
        foodType: 'Processed',
        ingredients: ['potatoes', 'vegetable oil', 'salt'],
        allergens: [],
        additives: ['preservatives']
      };
    }
    
    if (lowerName.includes('coca-cola') || lowerName.includes('cola') || lowerName.includes('soda')) {
      return {
        calories: 140,
        carbs: 39,
        protein: 0,
        fat: 0,
        saturatedFat: 0,
        fiber: 0,
        sugar: 39,
        sodium: 45,
        cholesterol: 0,
        potassium: 0,
        nutriScore: 'E',
        foodType: 'Ultra-processed',
        ingredients: ['carbonated water', 'high fructose corn syrup', 'caramel color', 'phosphoric acid', 'natural flavors', 'caffeine'],
        allergens: [],
        additives: ['artificial colors', 'preservatives']
      };
    }
    
    // Chicken breast
    if (lowerName.includes('chicken breast') || lowerName.includes('grilled chicken')) {
      return {
        calories: 165,
        carbs: 0,
        protein: 31,
        fat: 3.6,
        saturatedFat: 1.1,
        fiber: 0,
        sugar: 0,
        sodium: 74,
        cholesterol: 85,
        potassium: 256,
        nutriScore: 'A',
        foodType: 'Unprocessed',
        ingredients: ['chicken breast'],
        allergens: [],
        additives: []
      };
    }
    
    // Broccoli
    if (lowerName.includes('broccoli')) {
      return {
        calories: 55,
        carbs: 11,
        protein: 3.7,
        fat: 0.6,
        saturatedFat: 0.1,
        fiber: 5.2,
        sugar: 2.6,
        sodium: 33,
        cholesterol: 0,
        potassium: 316,
        nutriScore: 'A',
        foodType: 'Unprocessed',
        ingredients: ['broccoli'],
        allergens: [],
        additives: []
      };
    }
    
    // Brown rice
    if (lowerName.includes('brown rice')) {
      return {
        calories: 216,
        carbs: 45,
        protein: 4.5,
        fat: 1.8,
        saturatedFat: 0.4,
        fiber: 3.5,
        sugar: 0.8,
        sodium: 10,
        cholesterol: 0,
        potassium: 154,
        nutriScore: 'B',
        foodType: 'Minimally processed',
        ingredients: ['brown rice'],
        allergens: [],
        additives: []
      };
    }
    
    // Salad components
    if (lowerName.includes('mixed greens') || lowerName.includes('lettuce')) {
      return {
        calories: 15,
        carbs: 3,
        protein: 1.5,
        fat: 0.2,
        saturatedFat: 0,
        fiber: 1.2,
        sugar: 1.2,
        sodium: 28,
        cholesterol: 0,
        potassium: 194,
        nutriScore: 'A',
        foodType: 'Unprocessed',
        ingredients: ['mixed greens'],
        allergens: [],
        additives: []
      };
    }
    
    if (lowerName.includes('tomato') || lowerName.includes('cherry tomato')) {
      return {
        calories: 22,
        carbs: 4.8,
        protein: 1.1,
        fat: 0.2,
        saturatedFat: 0,
        fiber: 1.2,
        sugar: 3.2,
        sodium: 5,
        cholesterol: 0,
        potassium: 237,
        nutriScore: 'A',
        foodType: 'Unprocessed',
        ingredients: ['tomatoes'],
        allergens: [],
        additives: []
      };
    }
    
    if (lowerName.includes('cucumber')) {
      return {
        calories: 16,
        carbs: 3.6,
        protein: 0.7,
        fat: 0.1,
        saturatedFat: 0,
        fiber: 0.5,
        sugar: 1.7,
        sodium: 2,
        cholesterol: 0,
        potassium: 147,
        nutriScore: 'A',
        foodType: 'Unprocessed',
        ingredients: ['cucumber'],
        allergens: [],
        additives: []
      };
    }
    
    if (lowerName.includes('olive oil')) {
      return {
        calories: 120,
        carbs: 0,
        protein: 0,
        fat: 14,
        saturatedFat: 2,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        cholesterol: 0,
        potassium: 0,
        nutriScore: 'B',
        foodType: 'Minimally processed',
        ingredients: ['olive oil'],
        allergens: [],
        additives: []
      };
    }
    
    // Pizza components
    if (lowerName.includes('pizza slice')) {
      return {
        calories: 285,
        carbs: 35,
        protein: 12,
        fat: 12,
        saturatedFat: 4.5,
        fiber: 2,
        sugar: 3,
        sodium: 640,
        cholesterol: 25,
        potassium: 200,
        nutriScore: 'C',
        foodType: 'Processed',
        ingredients: ['flour', 'tomato sauce', 'mozzarella cheese', 'olive oil'],
        allergens: ['gluten', 'dairy'],
        additives: ['preservatives']
      };
    }
    
    if (lowerName.includes('pizza crust')) {
      return {
        calories: 150,
        carbs: 25,
        protein: 4,
        fat: 4,
        saturatedFat: 0.8,
        fiber: 1,
        sugar: 1,
        sodium: 380,
        cholesterol: 0,
        potassium: 80,
        nutriScore: 'C',
        foodType: 'Processed',
        ingredients: ['flour', 'yeast', 'olive oil', 'salt'],
        allergens: ['gluten'],
        additives: []
      };
    }
    
    if (lowerName.includes('pizza toppings')) {
      return {
        calories: 135,
        carbs: 10,
        protein: 8,
        fat: 8,
        saturatedFat: 3.2,
        fiber: 1,
        sugar: 2,
        sodium: 260,
        cholesterol: 20,
        potassium: 120,
        nutriScore: 'C',
        foodType: 'Processed',
        ingredients: ['tomato sauce', 'cheese', 'pepperoni', 'vegetables'],
        allergens: ['dairy'],
        additives: ['preservatives']
      };
    }
    
    // Pasta components
    if (lowerName.includes('cooked pasta') || lowerName.includes('pasta')) {
      return {
        calories: 220,
        carbs: 43,
        protein: 8,
        fat: 1,
        saturatedFat: 0.2,
        fiber: 2,
        sugar: 1,
        sodium: 8,
        cholesterol: 0,
        potassium: 55,
        nutriScore: 'B',
        foodType: 'Processed',
        ingredients: ['durum wheat', 'water', 'eggs'],
        allergens: ['gluten', 'eggs'],
        additives: []
      };
    }
    
    if (lowerName.includes('tomato sauce')) {
      return {
        calories: 25,
        carbs: 5,
        protein: 1,
        fat: 0,
        fiber: 1,
        sugar: 3,
        nutriScore: 'A',
        foodType: 'Minimally processed',
        ingredients: ['tomatoes', 'onions', 'garlic', 'herbs'],
        allergens: [],
        additives: []
      };
    }
    
    if (lowerName.includes('parmesan')) {
      return {
        calories: 22,
        carbs: 0,
        protein: 2,
        fat: 1.5,
        fiber: 0,
        sugar: 0,
        nutriScore: 'B',
        foodType: 'Processed',
        ingredients: ['milk', 'salt', 'enzymes'],
        allergens: ['dairy'],
        additives: []
      };
    }
    
    // Sandwich components
    if (lowerName.includes('bread') || lowerName.includes('sandwich roll')) {
      return {
        calories: 80,
        carbs: 15,
        protein: 3,
        fat: 1,
        fiber: 1,
        sugar: 1,
        nutriScore: 'B',
        foodType: 'Processed',
        ingredients: ['flour', 'yeast', 'water', 'salt'],
        allergens: ['gluten'],
        additives: []
      };
    }
    
    if (lowerName.includes('protein') || lowerName.includes('meat')) {
      return {
        calories: 120,
        carbs: 0,
        protein: 20,
        fat: 5,
        fiber: 0,
        sugar: 0,
        nutriScore: 'B',
        foodType: 'Processed',
        ingredients: ['meat', 'seasonings'],
        allergens: [],
        additives: ['preservatives']
      };
    }
    
    // Sushi components
    if (lowerName.includes('sushi rice')) {
      return {
        calories: 205,
        carbs: 45,
        protein: 4,
        fat: 0,
        fiber: 1,
        sugar: 0,
        nutriScore: 'B',
        foodType: 'Processed',
        ingredients: ['rice', 'vinegar', 'sugar', 'salt'],
        allergens: [],
        additives: []
      };
    }
    
    if (lowerName.includes('fish') || lowerName.includes('protein')) {
      return {
        calories: 45,
        carbs: 0,
        protein: 9,
        fat: 1,
        fiber: 0,
        sugar: 0,
        nutriScore: 'A',
        foodType: 'Unprocessed',
        ingredients: ['fish'],
        allergens: ['fish'],
        additives: []
      };
    }
    
    if (lowerName.includes('nori') || lowerName.includes('seaweed')) {
      return {
        calories: 5,
        carbs: 1,
        protein: 1,
        fat: 0,
        fiber: 0,
        sugar: 0,
        nutriScore: 'A',
        foodType: 'Unprocessed',
        ingredients: ['seaweed'],
        allergens: [],
        additives: []
      };
    }
    
    // Burger components
    if (lowerName.includes('beef patty')) {
      return {
        calories: 250,
        carbs: 0,
        protein: 20,
        fat: 18,
        fiber: 0,
        sugar: 0,
        nutriScore: 'C',
        foodType: 'Processed',
        ingredients: ['beef', 'salt', 'pepper'],
        allergens: [],
        additives: []
      };
    }
    
    if (lowerName.includes('burger bun')) {
      return {
        calories: 120,
        carbs: 22,
        protein: 4,
        fat: 2,
        fiber: 1,
        sugar: 2,
        nutriScore: 'C',
        foodType: 'Processed',
        ingredients: ['flour', 'yeast', 'sugar', 'eggs'],
        allergens: ['gluten', 'eggs'],
        additives: []
      };
    }
    
    if (lowerName.includes('cheese slice')) {
      return {
        calories: 60,
        carbs: 0,
        protein: 4,
        fat: 5,
        fiber: 0,
        sugar: 0,
        nutriScore: 'C',
        foodType: 'Processed',
        ingredients: ['milk', 'salt', 'enzymes'],
        allergens: ['dairy'],
        additives: []
      };
    }
    
    // Taco/Burrito components
    if (lowerName.includes('tortilla')) {
      return {
        calories: 90,
        carbs: 15,
        protein: 3,
        fat: 2,
        fiber: 1,
        sugar: 0,
        nutriScore: 'B',
        foodType: 'Processed',
        ingredients: ['corn flour', 'water', 'salt'],
        allergens: [],
        additives: []
      };
    }
    
    if (lowerName.includes('cheese')) {
      return {
        calories: 50,
        carbs: 0,
        protein: 3,
        fat: 4,
        fiber: 0,
        sugar: 0,
        nutriScore: 'C',
        foodType: 'Processed',
        ingredients: ['milk', 'salt', 'enzymes'],
        allergens: ['dairy'],
        additives: []
      };
    }
    
    // Legumes
    if (lowerName.includes('black beans') || lowerName.includes('beans')) {
      return {
        calories: 227,
        carbs: 41,
        protein: 15,
        fat: 1,
        fiber: 15,
        sugar: 1,
        nutriScore: 'A',
        foodType: 'Unprocessed',
        ingredients: ['black beans', 'water', 'salt'],
        allergens: [],
        additives: []
      };
    }
    
    // Grains
    if (lowerName.includes('rice')) {
      return {
        calories: 205,
        carbs: 45,
        protein: 4,
        fat: 0,
        fiber: 1,
        sugar: 0,
        nutriScore: 'B',
        foodType: 'Minimally processed',
        ingredients: ['rice', 'water'],
        allergens: [],
        additives: []
      };
    }
    
    // Protein
    if (lowerName.includes('chicken')) {
      return {
        calories: 165,
        carbs: 0,
        protein: 31,
        fat: 4,
        fiber: 0,
        sugar: 0,
        nutriScore: 'A',
        foodType: 'Unprocessed',
        ingredients: ['chicken breast', 'salt', 'pepper'],
        allergens: [],
        additives: []
      };
    }
    
    // Beverages
    if (lowerName.includes('coke') || lowerName.includes('cola') || lowerName.includes('soda')) {
      return {
        calories: 140,
        carbs: 39,
        protein: 0,
        fat: 0,
        fiber: 0,
        sugar: 39,
        nutriScore: 'E',
        foodType: 'Ultra-processed',
        ingredients: ['carbonated water', 'high fructose corn syrup', 'caramel color', 'phosphoric acid', 'natural flavors', 'caffeine'],
        allergens: [],
        additives: ['phosphoric acid', 'caramel color', 'caffeine']
      };
    }
    
    // Default fallback
    return {
      calories: 100,
      carbs: 20,
      protein: 5,
      fat: 2,
      fiber: 2,
      sugar: 5,
      nutriScore: 'C',
      foodType: 'Unknown',
      ingredients: ['unknown'],
      allergens: [],
      additives: []
    };
  };

  // Function to calculate overall nutrition score
  const calculateOverallNutritionScore = (totals: any) => {
    const calories = totals.calories;
    const fat = totals.fat;
    const saturatedFat = totals.fat * 0.3; // Estimate
    const sugar = totals.sugar;
    
    let score = 0;
    
    // Energy (calories)
    if (calories <= 335) score += 0;
    else if (calories <= 670) score += 1;
    else if (calories <= 1005) score += 2;
    else if (calories <= 1340) score += 3;
    else if (calories <= 1675) score += 4;
    else score += 5;
    
    // Saturated fat
    if (saturatedFat <= 1) score += 0;
    else if (saturatedFat <= 2) score += 1;
    else if (saturatedFat <= 3) score += 2;
    else if (saturatedFat <= 4) score += 3;
    else if (saturatedFat <= 5) score += 4;
    else score += 5;
    
    // Sugar
    if (sugar <= 4.5) score += 0;
    else if (sugar <= 9) score += 1;
    else if (sugar <= 13.5) score += 2;
    else if (sugar <= 18) score += 3;
    else if (sugar <= 22.5) score += 4;
    else score += 5;
    
    // Convert to letter grade
    if (score <= 2) return 'A';
    else if (score <= 10) return 'B';
    else if (score <= 18) return 'C';
    else if (score <= 26) return 'D';
    else return 'E';
  };

  // Function to generate detailed meal breakdown based on description
  const generateDetailedMealBreakdown = (description: string) => {
    // This is a mock implementation - in a real app, this would call the AI service
    // The actual prompt would be: "Extract foods, portions, and estimate calories, protein, carbs, fat, and sugar from here: $meal description from the describe your meal"
    console.log('AI Validation Prompt:', `Extract foods, portions, and estimate calories, protein, carbs, fat, and sugar from here: ${description}`);
    
    const lowerDesc = description.toLowerCase();
    
    // First, translate Portuguese terms to English for processing
    const translatedDescription = translateFoodToEnglish(description);
    const translatedLowerDesc = translatedDescription.toLowerCase();
    
    if (lowerDesc.includes('big mac') || lowerDesc.includes('mcdonalds')) {
      // Check for qualifiers that indicate partial meal
      const hasQualifier = lowerDesc.includes('just') || lowerDesc.includes('only') || lowerDesc.includes('without') || lowerDesc.includes('no fries') || lowerDesc.includes('no drink') || lowerDesc.includes('burger only') || lowerDesc.includes('just the burger');
      
      if (hasQualifier) {
        // User wants just the burger
        return {
          confidence: 95,
          userInformation: `User said: "${description}"`,
          identifiedMeal: 'Big Mac Burger Only',
          understoodItems: [
            'User specified only the burger component',
            'Excluded fries and drink as requested',
            'Ready for nutritional analysis'
          ],
          mealBreakdown: `Big Mac burger only includes:`,
          searchTerms: ['beef burger', 'burger', 'beef patty'],
          suggestedItems: [
            {
              name: 'Beef Burger',
              quantity: 1,
              unit: 'burger',
              description: 'Beef patty with lettuce, cheese, pickles, onions on bun',
              quantityDescription: '1 standard Big Mac burger (approximately 219g)',
              searchTerms: ['beef burger', 'burger', 'beef patty'],
              brand: 'Generic',
              category: 'Burger'
            }
          ]
        };
      } else {
        // Full Big Mac meal
        return {
          confidence: 92,
          userInformation: `User said: "${description}"`,
          identifiedMeal: 'Big Mac meal',
          understoodItems: [
            'Successfully expanded into individual components',
            'Extracted generic food names for database search',
            'Ready for nutritional analysis'
          ],
          mealBreakdown: `Big Mac meal typically includes:`,
          searchTerms: ['beef burger', 'french fries', 'cola', 'soft drink'],
          suggestedItems: [
            {
              name: 'Beef Burger',
              quantity: 1,
              unit: 'burger',
              description: 'Beef patty with lettuce, cheese, pickles, onions on bun',
              quantityDescription: '1 standard Big Mac burger (approximately 219g)',
              searchTerms: ['beef burger', 'burger', 'beef patty'],
              brand: 'Generic',
              category: 'Burger'
            },
            {
              name: 'French Fries',
              quantity: 1,
              unit: 'serving',
              description: 'Crispy potato fries, approximately 117g serving',
              quantityDescription: '1 medium serving of french fries (approximately 117g)',
              searchTerms: ['french fries', 'potato fries', 'fries'],
              brand: 'Generic',
              category: 'Side Dish'
            },
            {
              name: 'Cola',
              quantity: 1,
              unit: 'drink',
              description: 'Carbonated soft drink, approximately 16 fl oz (473ml)',
              quantityDescription: '1 medium soft drink (approximately 473ml)',
              searchTerms: ['cola', 'soft drink', 'carbonated drink'],
              brand: 'Generic',
              category: 'Beverage'
            }
          ]
        };
      }
    } else if (lowerDesc.includes('chicken') && lowerDesc.includes('breast')) {
      return {
        confidence: 88,
        userInformation: `User said: "${description}"`,
        identifiedMeal: 'Grilled Chicken Breast',
        understoodItems: [
          `Identified meal: ${description}`,
          'Successfully expanded into individual components',
          'Extracted portion sizes and serving details',
          'Ready for nutritional analysis'
        ],
        mealBreakdown: `${description} typically includes:`,
        searchTerms: ['chicken breast', 'grilled chicken'],
        suggestedItems: [
          {
            name: 'Grilled Chicken Breast',
            quantity: 1,
            unit: 'breast',
            description: 'Skinless, boneless chicken breast, approximately 150g'
          },
          {
            name: 'Steamed Broccoli',
            quantity: 1,
            unit: 'cup',
            description: 'Fresh broccoli florets, steamed until tender'
          },
          {
            name: 'Brown Rice',
            quantity: 0.5,
            unit: 'cup',
            description: 'Cooked brown rice, approximately 100g'
          }
        ]
      };
    } else if (lowerDesc.includes('salad')) {
      return {
        confidence: 85,
        understoodItems: [
          `Identified meal: ${description}`,
          'Successfully expanded into individual components',
          'Extracted portion sizes and serving details',
          'Ready for nutritional analysis'
        ],
        mealBreakdown: `${description} typically includes:`,
        suggestedItems: [
          {
            name: 'Mixed Greens',
            quantity: 2,
            unit: 'cups',
            description: 'Fresh mixed salad greens (lettuce, spinach, arugula)'
          },
          {
            name: 'Cherry Tomatoes',
            quantity: 0.5,
            unit: 'cup',
            description: 'Fresh cherry tomatoes, halved'
          },
          {
            name: 'Cucumber',
            quantity: 0.5,
            unit: 'medium',
            description: 'Fresh cucumber, sliced'
          },
          {
            name: 'Olive Oil',
            quantity: 1,
            unit: 'tbsp',
            description: 'Extra virgin olive oil for dressing'
          }
        ]
      };
    } else if (lowerDesc.includes('pizza')) {
      // Extract quantity from user input - handle various formats including typos
      let quantity = 1;
      const quantityPatterns = [
        /(\d+)\s*(slice|slices)/i,  // "3 slices", "1 slice"
        /(\d+)\s*(slide|slides)/i,  // "3 slides" (typo)
        /(\d+)\s*(piece|pieces)/i,  // "2 pieces"
        /(\d+)\s*(portion|portions)/i  // "1 portion"
      ];
      
      for (const pattern of quantityPatterns) {
        const match = description.match(pattern);
        if (match) {
          quantity = parseInt(match[1]);
          break;
        }
      }
      
      // Extract pizza type - handle various pizza types including calabrese
      let pizzaType = 'cheese';
      const pizzaTypePatterns = [
        /(calabrese|margherita|pepperoni|hawaiian|vegetarian|meat lovers|supreme|bbq|buffalo|white|deep dish|thin crust|thick crust|stuffed crust|gluten free|vegan|organic|artisan|gourmet|premium|deluxe|specialty|signature|classic|traditional|italian|american|new york|chicago|detroit|sicilian|neapolitan|roman|calzone|stromboli|flatbread|focaccia)/i,
        /(\d+\s*cheese)/i  // "4 cheese", "3 cheese"
      ];
      
      for (const pattern of pizzaTypePatterns) {
        const match = description.match(pattern);
        if (match) {
          pizzaType = match[1].trim();
          break;
        }
      }
      
      // Check for additional items like drinks
      const hasDrink = lowerDesc.includes('coke') || lowerDesc.includes('cola') || lowerDesc.includes('soda') || lowerDesc.includes('drink') || lowerDesc.includes('beverage');
      
      const suggestedItems = [
        {
          name: `${pizzaType} Pizza Slice`,
          quantity: quantity,
          unit: quantity === 1 ? 'slice' : 'slices',
          description: `${pizzaType} pizza slice with cheese and toppings`,
          quantityDescription: `${quantity} ${quantity === 1 ? 'slice' : 'slices'} of ${pizzaType} pizza (approximately ${quantity * 100}g total)`,
          searchTerms: ['pizza slice', pizzaType.toLowerCase(), 'cheese pizza'],
          brand: 'Generic',
          category: 'Pizza'
        }
      ];
      
      // Add drink if mentioned
      if (hasDrink) {
        const drinkMatch = description.match(/(coke|cola|soda|drink|beverage)/i);
        const drinkName = drinkMatch ? drinkMatch[1] : 'Cola';
        
        // Improved drink quantity extraction - handle various formats
        let drinkQty = 1;
        let drinkUnit = 'can';
        
        // Try different patterns for drink quantity
        const patterns = [
          /(\d+)\s*(can|cans|bottle|bottles|cup|cups)/i,  // "5 cans", "2 bottles"
          /(\d+)\s*(coke|cola|soda)\s*\(?(can|cans|bottle|bottles|cup|cups)?\)?/i,  // "5 cokes (cans)", "3 colas"
          /(\d+)\s*(coke|cola|soda)/i,  // "5 cokes", "3 colas"
          /(\d+)\s*\(?(can|cans|bottle|bottles|cup|cups)\)?/i  // "5 (cans)", "3 (bottles)"
        ];
        
        for (const pattern of patterns) {
          const match = description.match(pattern);
          if (match) {
            drinkQty = parseInt(match[1]);
            if (match[2] && ['can', 'cans', 'bottle', 'bottles', 'cup', 'cups'].includes(match[2].toLowerCase())) {
              drinkUnit = match[2].toLowerCase();
            } else if (match[3] && ['can', 'cans', 'bottle', 'bottles', 'cup', 'cups'].includes(match[3].toLowerCase())) {
              drinkUnit = match[3].toLowerCase();
            }
            break;
          }
        }
        
        suggestedItems.push({
          name: drinkName,
          quantity: drinkQty,
          unit: drinkUnit,
          description: `${drinkName} soft drink`,
          quantityDescription: `${drinkQty} ${drinkUnit}${drinkQty > 1 ? 's' : ''} of ${drinkName} (approximately ${drinkQty * 355}ml total)`,
          searchTerms: [drinkName.toLowerCase(), 'soft drink', 'cola'],
          brand: 'Generic',
          category: 'Beverage'
        });
      }
      
      return {
        confidence: 88,
        userInformation: `User said: "${description}"`,
        identifiedMeal: hasDrink ? `${pizzaType} Pizza with Drink` : `${pizzaType} Pizza`,
        understoodItems: [
          'Successfully identified specific pizza type and quantity',
          'Extracted additional items (drinks)',
          'Extracted generic food names for database search',
          'Ready for nutritional analysis'
        ],
        mealBreakdown: `${pizzaType} pizza with ${hasDrink ? 'drink' : 'no drink'} typically includes:`,
        searchTerms: ['pizza', pizzaType.toLowerCase(), 'cheese pizza', ...(hasDrink ? ['coke', 'cola', 'soft drink'] : [])],
        suggestedItems: suggestedItems
      };
    } else if (lowerDesc.includes('pasta') || lowerDesc.includes('spaghetti')) {
      return {
        confidence: 86,
        userInformation: `User said: "${description}"`,
        identifiedMeal: 'Pasta',
        understoodItems: [
          'Successfully expanded into individual components',
          'Extracted generic food names for database search',
          'Ready for nutritional analysis'
        ],
        mealBreakdown: `Pasta typically includes:`,
        searchTerms: ['pasta', 'spaghetti', 'tomato sauce'],
        suggestedItems: [
          {
            name: 'Pasta',
            quantity: 2,
            unit: 'cups',
            description: 'Cooked pasta with sauce',
            quantityDescription: '2 cups of cooked pasta with sauce (approximately 320g total)',
            searchTerms: ['pasta', 'spaghetti'],
            brand: 'Generic',
            category: 'Pasta'
          }
        ]
      };
    } else if (lowerDesc.includes('sandwich') || lowerDesc.includes('sub')) {
      return {
        confidence: 84,
        userInformation: `User said: "${description}"`,
        identifiedMeal: 'Sandwich',
        understoodItems: [
          'Successfully expanded into individual components',
          'Extracted generic food names for database search',
          'Ready for nutritional analysis'
        ],
        mealBreakdown: `Sandwich typically includes:`,
        searchTerms: ['sandwich', 'bread', 'meat', 'cheese'],
        suggestedItems: [
          {
            name: 'Sandwich',
            quantity: 1,
            unit: 'sandwich',
            description: 'Sandwich with bread, meat, cheese, and vegetables',
            quantityDescription: '1 medium sandwich (approximately 250g)',
            searchTerms: ['sandwich', 'sub sandwich'],
            brand: 'Generic',
            category: 'Sandwich'
          }
        ]
      };
    } else if (lowerDesc.includes('sushi') || lowerDesc.includes('roll')) {
      return {
        confidence: 83,
        userInformation: `User said: "${description}"`,
        identifiedMeal: 'Sushi',
        understoodItems: [
          'Successfully expanded into individual components',
          'Extracted generic food names for database search',
          'Ready for nutritional analysis'
        ],
        mealBreakdown: `Sushi typically includes:`,
        searchTerms: ['sushi', 'sushi roll', 'fish'],
        suggestedItems: [
          {
            name: 'Sushi Roll',
            quantity: 1,
            unit: 'roll',
            description: 'Sushi roll with rice, fish, and vegetables',
            quantityDescription: '1 sushi roll (approximately 150g)',
            searchTerms: ['sushi', 'sushi roll'],
            brand: 'Generic',
            category: 'Sushi'
          }
        ]
      };
    } else if (lowerDesc.includes('burger') || lowerDesc.includes('hamburger')) {
      return {
        confidence: 89,
        userInformation: `User said: "${description}"`,
        identifiedMeal: 'Burger',
        understoodItems: [
          'Successfully expanded into individual components',
          'Extracted generic food names for database search',
          'Ready for nutritional analysis'
        ],
        mealBreakdown: `Burger typically includes:`,
        searchTerms: ['burger', 'beef burger', 'hamburger'],
        suggestedItems: [
          {
            name: 'Burger',
            quantity: 1,
            unit: 'burger',
            description: 'Burger with bun, beef patty, cheese, and vegetables',
            quantityDescription: '1 medium burger (approximately 250g)',
            searchTerms: ['burger', 'beef burger'],
            brand: 'Generic',
            category: 'Burger'
          }
        ]
      };
    } else if (lowerDesc.includes('taco') || lowerDesc.includes('burrito')) {
      return {
        confidence: 86,
        userInformation: `User said: "${description}"`,
        identifiedMeal: 'Taco/Burrito',
        understoodItems: [
          'Successfully expanded into individual components',
          'Extracted generic food names for database search',
          'Ready for nutritional analysis'
        ],
        mealBreakdown: `Taco/Burrito typically includes:`,
        searchTerms: ['taco', 'burrito', 'tortilla'],
        suggestedItems: [
          {
            name: 'Taco/Burrito',
            quantity: 1,
            unit: 'piece',
            description: 'Taco or burrito with tortilla, meat, cheese, and vegetables',
            quantityDescription: '1 medium taco/burrito (approximately 200g)',
            searchTerms: ['taco', 'burrito'],
            brand: 'Generic',
            category: 'Mexican Food'
          }
        ]
      };
    } else {
      // Try to break down composite meals
      const lowerDesc = description.toLowerCase();
      
      // Check for common meal combinations
      if (lowerDesc.includes('beans') && lowerDesc.includes('rice')) {
        return {
          confidence: 85,
          userInformation: `User said: "${description}"`,
          identifiedMeal: 'Beans and Rice',
          understoodItems: [
            'Successfully identified composite meal components',
            'Extracted individual food items for database search',
            'Ready for detailed nutritional analysis'
          ],
          mealBreakdown: `Beans and rice typically includes:`,
          searchTerms: ['black beans', 'rice', 'beans and rice'],
          suggestedItems: [
            {
              name: 'Black Beans',
              quantity: 1,
              unit: 'cup',
              description: 'Cooked black beans',
              quantityDescription: '1 cup of cooked black beans (approximately 172g)',
              searchTerms: ['black beans', 'cooked beans'],
              brand: 'Generic',
              category: 'Legumes'
            },
            {
              name: 'Rice',
              quantity: 1,
              unit: 'cup',
              description: 'Cooked rice',
              quantityDescription: '1 cup of cooked rice (approximately 195g)',
              searchTerms: ['rice', 'cooked rice'],
              brand: 'Generic',
              category: 'Grains'
            }
          ]
        };
      }
      
      // Check for other common combinations
      if (lowerDesc.includes('chicken') && lowerDesc.includes('rice')) {
        return {
          confidence: 85,
          userInformation: `User said: "${description}"`,
          identifiedMeal: 'Chicken and Rice',
          understoodItems: [
            'Successfully identified composite meal components',
            'Extracted individual food items for database search',
            'Ready for detailed nutritional analysis'
          ],
          mealBreakdown: `Chicken and rice typically includes:`,
          searchTerms: ['chicken', 'rice', 'chicken and rice'],
          suggestedItems: [
            {
              name: 'Chicken',
              quantity: 1,
              unit: 'piece',
              description: 'Cooked chicken breast or thigh',
              quantityDescription: '1 medium chicken piece (approximately 100g)',
              searchTerms: ['chicken', 'cooked chicken'],
              brand: 'Generic',
              category: 'Protein'
            },
            {
              name: 'Rice',
              quantity: 1,
              unit: 'cup',
              description: 'Cooked rice',
              quantityDescription: '1 cup of cooked rice (approximately 195g)',
              searchTerms: ['rice', 'cooked rice'],
              brand: 'Generic',
              category: 'Grains'
            }
          ]
        };
      }
      
      // Comprehensive quantity extraction for any food or drink
      const foodItems = [];
      
      // Comprehensive food and drink patterns with quantities
      const comprehensivePatterns = [
        // Pizza patterns
        { pattern: /(\d+)\s*(slice|slices|slide|slides)/i, name: 'Pizza Slice', unit: 'slice', category: 'Pizza' },
        { pattern: /(\d+)\s*(piece|pieces)\s*(?:of\s+)?pizza/i, name: 'Pizza', unit: 'piece', category: 'Pizza' },
        
        // Beverage patterns
        { pattern: /(\d+)\s*(can|cans|bottle|bottles|cup|cups|glass|glasses)\s*(?:of\s+)?(coke|cola|soda|beer|wine|water|juice|milk|coffee|tea)/i, name: '$3', unit: '$2', category: 'Beverage' },
        { pattern: /(\d+)\s*(coke|cola|soda|beer|wine|water|juice|milk|coffee|tea)\s*\(?(can|cans|bottle|bottles|cup|cups|glass|glasses)?\)?/i, name: '$2', unit: '$3', category: 'Beverage' },
        { pattern: /(\d+)\s*(can|cans|bottle|bottles|cup|cups|glass|glasses)/i, name: 'Beverage', unit: '$2', category: 'Beverage' },
        
        // Food quantity patterns
        { pattern: /(\d+)\s*(slice|slices|piece|pieces)\s*(?:of\s+)?(bread|toast|cake|pie)/i, name: '$3', unit: '$2', category: 'Bread' },
        { pattern: /(\d+)\s*(cup|cups|bowl|bowls)\s*(?:of\s+)?(rice|pasta|soup|salad|cereal|yogurt)/i, name: '$3', unit: '$2', category: 'Food' },
        { pattern: /(\d+)\s*(piece|pieces|slice|slices)\s*(?:of\s+)?(chicken|fish|meat|steak|burger|sandwich)/i, name: '$3', unit: '$2', category: 'Protein' },
        { pattern: /(\d+)\s*(apple|banana|orange|pear|peach|grape|strawberry|strawberries)/i, name: '$2', unit: 'piece', category: 'Fruit' },
        { pattern: /(\d+)\s*(egg|eggs)/i, name: 'Egg', unit: 'egg', category: 'Protein' },
        { pattern: /(\d+)\s*(serving|servings)\s*(?:of\s+)?(.+)/i, name: '$3', unit: 'serving', category: 'Food' },
        
        // Weight/volume patterns
        { pattern: /(\d+(?:\.\d+)?)\s*(g|gram|grams|kg|kilo|kilos|oz|ounce|ounces|lb|pound|pounds)\s*(?:of\s+)?(.+)/i, name: '$3', unit: '$2', category: 'Food' },
        { pattern: /(\d+(?:\.\d+)?)\s*(ml|milliliter|milliliters|l|liter|liters|fl\s*oz|fluid\s*ounce|fluid\s*ounces)\s*(?:of\s+)?(.+)/i, name: '$3', unit: '$2', category: 'Beverage' },
        
        // Generic patterns
        { pattern: /(\d+)\s*(piece|pieces|slice|slices|portion|portions)/i, name: 'Food Item', unit: '$2', category: 'Food' }
      ];
      
      // Extract quantities and food items using comprehensive patterns
      for (const pattern of comprehensivePatterns) {
        let match;
        const regex = new RegExp(pattern.pattern.source, 'gi');
        while ((match = regex.exec(description)) !== null) {
          const quantity = parseInt(match[1]);
          let unit = pattern.unit;
          let name = pattern.name;
          let category = pattern.category;
          
          // Handle dynamic name extraction
          if (name.includes('$')) {
            const nameIndex = parseInt(name.replace('$', ''));
            name = match[nameIndex] || 'Food Item';
          }
          
          // Handle dynamic unit extraction
          if (unit.includes('$')) {
            const unitIndex = parseInt(unit.replace('$', ''));
            unit = match[unitIndex] || 'piece';
          }
          
          // Normalize unit names
          const unitMap: { [key: string]: string } = {
            'slice': 'slice', 'slices': 'slice', 'slide': 'slice', 'slides': 'slice',
            'piece': 'piece', 'pieces': 'piece',
            'can': 'can', 'cans': 'can',
            'bottle': 'bottle', 'bottles': 'bottle',
            'cup': 'cup', 'cups': 'cup',
            'glass': 'glass', 'glasses': 'glass',
            'serving': 'serving', 'servings': 'serving',
            'portion': 'portion', 'portions': 'portion',
            'egg': 'egg', 'eggs': 'egg',
            'g': 'g', 'gram': 'g', 'grams': 'g',
            'kg': 'kg', 'kilo': 'kg', 'kilos': 'kg',
            'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
            'lb': 'lb', 'pound': 'lb', 'pounds': 'lb',
            'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
            'l': 'l', 'liter': 'l', 'liters': 'l',
            'fl oz': 'fl oz', 'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz'
          };
          
          unit = unitMap[unit.toLowerCase()] || unit;
          
          // Capitalize food name
          name = name.charAt(0).toUpperCase() + name.slice(1);
          
          // Create search terms
          const searchTerms = [name.toLowerCase()];
          if (category === 'Beverage') {
            searchTerms.push('drink', 'beverage');
          }
          
          foodItems.push({
            name: name,
            quantity: quantity,
            unit: unit,
            description: `${quantity} ${unit}${quantity > 1 ? 's' : ''} of ${name.toLowerCase()}`,
            quantityDescription: `${quantity} ${unit}${quantity > 1 ? 's' : ''} of ${name.toLowerCase()}`,
            searchTerms: searchTerms,
            brand: 'Generic',
            category: category
          });
        }
      }
      
      // If no patterns found, try to extract individual food words with quantities
      if (foodItems.length === 0) {
        const commonFoods = [
          'pizza', 'burger', 'sandwich', 'pasta', 'rice', 'beans', 'chicken', 'fish', 'salad', 'soup', 
          'bread', 'cheese', 'milk', 'yogurt', 'apple', 'banana', 'orange', 'coke', 'cola', 'soda', 
          'water', 'juice', 'coffee', 'tea', 'steak', 'pork', 'lamb', 'turkey', 'duck', 'shrimp', 
          'salmon', 'tuna', 'cod', 'tilapia', 'beef', 'veal', 'ham', 'bacon', 'sausage', 'hot dog',
          'fries', 'potato', 'carrot', 'broccoli', 'spinach', 'lettuce', 'tomato', 'onion', 'garlic',
          'pepper', 'mushroom', 'corn', 'peas', 'beans', 'lentils', 'chickpeas', 'quinoa', 'oatmeal',
          'cereal', 'granola', 'nuts', 'almonds', 'walnuts', 'peanuts', 'cashews', 'seeds', 'flax',
          'chia', 'sunflower', 'pumpkin', 'avocado', 'olive', 'cucumber', 'celery', 'asparagus',
          'cauliflower', 'brussels sprouts', 'kale', 'chard', 'arugula', 'radish', 'beet', 'turnip',
          'sweet potato', 'yam', 'squash', 'zucchini', 'eggplant', 'bell pepper', 'jalapeno',
          'lemon', 'lime', 'grapefruit', 'pineapple', 'mango', 'kiwi', 'blueberry', 'strawberry',
          'raspberry', 'blackberry', 'cherry', 'peach', 'plum', 'apricot', 'nectarine', 'fig',
          'date', 'raisin', 'prune', 'cranberry', 'goji berry', 'acai', 'pomegranate'
        ];
        
        // Look for food words with numbers
        for (const food of commonFoods) {
          const foodPattern = new RegExp(`(\\d+)\\s*${food}`, 'i');
          const match = description.match(foodPattern);
          if (match) {
            const quantity = parseInt(match[1]);
            foodItems.push({
              name: food.charAt(0).toUpperCase() + food.slice(1),
              quantity: quantity,
              unit: 'piece',
              description: `${quantity} ${food}`,
              quantityDescription: `${quantity} ${food}`,
              searchTerms: [food],
              brand: 'Generic',
              category: 'Food'
            });
          }
        }
      }
      
      // If still no items found, use the original description
      if (foodItems.length === 0) {
        // Try to extract any food-related words from the description
        const words = description.toLowerCase().split(/\s+/);
        const commonFoodWords = [
          'pizza', 'burger', 'sandwich', 'pasta', 'rice', 'beans', 'chicken', 'fish', 'salad', 'soup', 
          'bread', 'cheese', 'milk', 'yogurt', 'apple', 'banana', 'orange', 'coke', 'cola', 'soda', 
          'water', 'juice', 'coffee', 'tea', 'steak', 'pork', 'lamb', 'turkey', 'duck', 'shrimp', 
          'salmon', 'tuna', 'cod', 'tilapia', 'beef', 'veal', 'ham', 'bacon', 'sausage', 'hot dog',
          'fries', 'potato', 'carrot', 'broccoli', 'spinach', 'lettuce', 'tomato', 'onion', 'garlic',
          'pepper', 'mushroom', 'corn', 'peas', 'beans', 'lentils', 'chickpeas', 'quinoa', 'oatmeal',
          'cereal', 'granola', 'nuts', 'almonds', 'walnuts', 'peanuts', 'cashews', 'seeds', 'flax',
          'chia', 'sunflower', 'pumpkin', 'avocado', 'olive', 'cucumber', 'celery', 'asparagus',
          'cauliflower', 'brussels sprouts', 'kale', 'chard', 'arugula', 'radish', 'beet', 'turnip',
          'sweet potato', 'yam', 'squash', 'zucchini', 'eggplant', 'bell pepper', 'jalapeno',
          'lemon', 'lime', 'grapefruit', 'pineapple', 'mango', 'kiwi', 'blueberry', 'strawberry',
          'raspberry', 'blackberry', 'cherry', 'peach', 'plum', 'apricot', 'nectarine', 'fig',
          'date', 'raisin', 'prune', 'cranberry', 'goji berry', 'acai', 'pomegranate'
        ];
        
        const foodWords = words.filter(word => {
          // Check if word is in our translation map or common food words
          const translatedWord = translateFoodToEnglish(word);
          return translatedWord !== word || commonFoodWords.includes(word);
        });
        
        if (foodWords.length > 0) {
          // Create items for each identified food word
          foodWords.forEach(word => {
            const translatedWord = translateFoodToEnglish(word);
            foodItems.push({
              name: translatedWord.charAt(0).toUpperCase() + translatedWord.slice(1),
              quantity: 1,
              unit: 'serving',
              description: `1 serving of ${translatedWord}`,
              quantityDescription: `1 standard serving of ${translatedWord}`,
              searchTerms: [translatedWord, word, `${translatedWord} nutrition`],
              brand: 'Generic',
              category: 'Food'
            });
          });
        } else {
          // Last resort: use the original description
          foodItems.push({
            name: description,
            quantity: 1,
            unit: 'serving',
            description: 'Complete meal serving, details to be determined from nutritional database',
            quantityDescription: '1 standard serving (quantity to be determined)',
            searchTerms: [description, `${description} nutrition`],
            brand: 'Generic',
            category: 'Meal'
          });
        }
      }
      
      return {
        confidence: 75,
        userInformation: `User said: "${description}"`,
        identifiedMeal: foodItems.length > 1 ? 'Composite Meal' : foodItems[0]?.name || description,
        understoodItems: [
          'Successfully identified food items from description',
          'Extracted quantities and serving sizes',
          'Processed multilingual food terms',
          'Ready for nutritional analysis'
        ],
        mealBreakdown: `Identified ${foodItems.length} food item(s):`,
        searchTerms: foodItems.flatMap(item => item.searchTerms),
        suggestedItems: foodItems
      };
    }
  };

  // Check OpenFoodFacts data status on component mount
  useEffect(() => {
    if (isOpen) {
      checkOpenFoodFactsData();
    }
  }, [isOpen]);

  const checkOpenFoodFactsData = async () => {
    try {
      setOpenFoodFactsStatus('checking');
      const response = await nutritionAxios.get('/nutrition/openfoodfacts/status');
      if (response.data.needsUpdate) {
        setOpenFoodFactsStatus('updating');
        await updateOpenFoodFactsData();
      } else {
        setOpenFoodFactsStatus('ready');
      }
    } catch (error) {
      console.error('Error checking OpenFoodFacts data:', error);
      setOpenFoodFactsStatus('error');
    }
  };

  const updateOpenFoodFactsData = async () => {
    try {
      await nutritionAxios.post('/nutrition/openfoodfacts/update');
      setOpenFoodFactsStatus('ready');
      toast.success('OpenFoodFacts data updated successfully!');
    } catch (error) {
      console.error('Error updating OpenFoodFacts data:', error);
      setOpenFoodFactsStatus('error');
      toast.error('Failed to update OpenFoodFacts data');
    }
  };

  // Security Banner Component
  const SecurityBanner = ({ error, details, onClose }: { error: string; details: any; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className={`relative p-6 border-b border-gray-100 rounded-t-2xl ${
          details?.honeypot 
            ? 'bg-gradient-to-r from-orange-50 to-yellow-50' 
            : 'bg-gradient-to-r from-red-50 to-orange-50'
        }`}>
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                details?.honeypot ? 'bg-orange-100' : 'bg-red-100'
              }`}>
                {details?.honeypot ? (
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {details?.honeypot ? 'Honeypot Activated' : 'Security Alert'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {details?.honeypot 
                  ? 'Fake credentials provided to attacker' 
                  : 'Content blocked by Trend Micro Vision One AI Guard'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Block Reason or Honeypot Alert */}
          <div className="space-y-3">
            <h4 className="text-lg font-medium text-gray-900 flex items-center">
              <span className={`w-2 h-2 rounded-full mr-3 ${
                details?.honeypot ? 'bg-orange-500' : 'bg-red-500'
              }`}></span>
              {details?.honeypot ? 'Honeypot Triggered' : 'Block Reason'}
            </h4>
            <div className={`border rounded-xl p-4 ${
              details?.honeypot 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                  details?.honeypot ? 'bg-orange-100' : 'bg-red-100'
                }`}>
                  {details?.honeypot ? (
                    <svg className="w-3 h-3 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${
                    details?.honeypot ? 'text-orange-800' : 'text-red-800'
                  }`}>
                    {details?.honeypot 
                      ? 'Secret/API key request detected - fake credentials provided'
                      : error
                    }
                  </p>
                  <p className={`text-sm mt-1 ${
                    details?.honeypot ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {details?.honeypot 
                      ? 'This incident has been logged for security monitoring'
                      : 'This content was flagged as potentially malicious'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Honeypot Details */}
          {details?.honeypot && details?.input_scan?.result?.fakeSecret && (
            <div className="space-y-3">
              <h4 className="text-lg font-medium text-gray-900 flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                Fake Credentials Provided
              </h4>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Fake Credential:</p>
                    <div className="bg-white border border-yellow-200 rounded-lg p-3">
                      <p className="text-gray-900 font-mono text-sm break-all">
                        {details.input_scan.result.fakeSecret}
                      </p>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 text-sm">
                      <strong>Note:</strong> This is a honeypot response. The attacker has been provided with fake credentials 
                      and their request has been logged for security monitoring.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Guard Response */}
          {details && !details.honeypot && (
            <div className="space-y-3">
              <h4 className="text-lg font-medium text-gray-900 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                AI Guard Analysis
              </h4>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="space-y-4">
                  {/* Input Scan */}
                  {details.input_scan && (
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-900 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Input Scan
                        </h5>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          details.input_scan.result?.action === 'Block' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {details.input_scan.result?.action || 'Unknown'}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reason:</span>
                          <span className="text-gray-900 font-medium">{details.input_scan.result?.reason || 'No reason provided'}</span>
                        </div>
                        {details.input_scan.result?.id && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Scan ID:</span>
                            <span className="text-gray-500 font-mono text-xs">{details.input_scan.result.id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Output Scan */}
                  {details.output_scan && (
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-900 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Output Scan
                        </h5>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          details.output_scan.result?.action === 'Block' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {details.output_scan.result?.action || 'Unknown'}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reason:</span>
                          <span className="text-gray-900 font-medium">{details.output_scan.result?.reason || 'No reason provided'}</span>
                        </div>
                        {details.output_scan.result?.id && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Scan ID:</span>
                            <span className="text-gray-500 font-mono text-xs">{details.output_scan.result.id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Raw API Response */}
                  {details.input_scan?.result && (
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Raw AI Guard Response
                      </h5>
                      <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs overflow-x-auto">
                        <pre>{JSON.stringify(details.input_scan.result, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Blocked Content */}
          <div className="space-y-3">
            <h4 className="text-lg font-medium text-gray-900 flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
              {details?.honeypot ? 'Attacker Request' : 'Blocked Content'}
            </h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">User Input:</p>
                  <div className="bg-white border border-yellow-200 rounded-lg p-3">
                    <p className="text-gray-900 font-mono text-sm">"{mealDescription}"</p>
                  </div>
                </div>
                
                {details?.output_scan?.result?.action === 'Block' && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">AI Response (Blocked):</p>
                    <div className="bg-white border border-yellow-200 rounded-lg p-3">
                      <p className="text-gray-500 italic text-sm">AI response was blocked by security scan</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Information Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-blue-800 font-medium mb-1">
                  {details?.honeypot ? 'Honeypot Response' : 'What happened?'}
                </p>
                <p className="text-blue-700 text-sm">
                  {details?.honeypot 
                    ? 'This incident has been automatically logged in the Security Reports. The attacker was provided with fake credentials to track their activities.'
                    : 'This incident has been automatically logged in the Security Reports. The meal cannot be saved due to security restrictions. Please try rephrasing your request to avoid triggering security filters.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const analyzeMeal = async () => {
    if (!mealDescription.trim()) {
      toast.error('Please enter a meal description');
      return;
    }

    try {
      setLoading(true);
      setSecurityBlocked(false);
      setSecurityError('');
      setShowSecurityBanner(false);
      setSecurityDetails(null);
      
      // Call the AI service for meal analysis
      const response = await aiAxios.post('/ai/analyze-meal', {
        meal_description: mealDescription
      });

      // Check if the response was blocked by security
      if (response.data.error && response.data.security_scan?.blocked) {
        setSecurityBlocked(true);
        setSecurityError(response.data.details || response.data.error);
        setSecurityDetails(response.data.security_scan);
        setShowSecurityBanner(true);
        return;
      }

      // Check if the AI analysis was blocked by security scan
      if (response.data.analysis?.security_scan?.output_scan?.result?.action === 'Block') {
        setSecurityBlocked(true);
        setSecurityError('AI response was blocked by security scan');
        setSecurityDetails(response.data.analysis.security_scan);
        setShowSecurityBanner(true);
        return;
      }

      // Check if input was blocked
      if (response.data.analysis?.security_scan?.input_scan?.result?.action === 'Block') {
        setSecurityBlocked(true);
        setSecurityError('Input was blocked by security scan');
        setSecurityDetails(response.data.analysis.security_scan);
        setShowSecurityBanner(true);
        return;
      }

      // Process the AI response to extract identified foods
      let aiAnalysisResult;
      try {
        // The AI service returns { analysis: mealAnalysisResponse } where mealAnalysisResponse.analysis contains the raw AI response
        const rawAiResponse = response.data.analysis.analysis;
        console.log('Raw AI response:', rawAiResponse);
        
        // Try to parse the AI response as JSON
        aiAnalysisResult = JSON.parse(rawAiResponse);
      } catch (error) {
        console.warn('AI response is not valid JSON, using fallback analysis');
        // Fallback to mock analysis if AI response is not JSON
        aiAnalysisResult = generateDetailedMealBreakdown(mealDescription);
      }

      // If we have a structured AI response, use it
      if (aiAnalysisResult.identified_foods && Array.isArray(aiAnalysisResult.identified_foods)) {
        const structuredAnalysis = {
          confidence: 85, // Higher confidence for structured AI response
          userInformation: `User said: "${mealDescription}"`,
          identifiedMeal: aiAnalysisResult.identified_foods.length > 1 ? 'Composite Meal' : aiAnalysisResult.identified_foods[0]?.name || mealDescription,
          understoodItems: [
            'AI identified only explicitly mentioned foods',
            'No assumptions or additional items added',
            'Precise food identification from user description',
            'Ready for nutritional analysis'
          ],
          mealBreakdown: `AI identified ${aiAnalysisResult.identified_foods.length} food item(s) from your description:`,
          searchTerms: aiAnalysisResult.identified_foods.flatMap((food: any) => [food.name, `${food.name} nutrition`]),
          suggestedItems: aiAnalysisResult.identified_foods.map((food: any) => ({
            name: food.name,
            quantity: food.quantity || 1,
            unit: food.unit || 'serving',
            description: `${food.quantity || 1} ${food.unit || 'serving'} of ${food.name}`,
            quantityDescription: `${food.quantity || 1} ${food.unit || 'serving'} of ${food.name}`,
            searchTerms: [food.name, `${food.name} nutrition`],
            brand: 'Generic',
            category: 'Food'
          }))
        };
        setAiAnalysis(structuredAnalysis);
      } else {
        // Fallback to mock analysis
        const mockAnalysis = generateDetailedMealBreakdown(mealDescription);
        setAiAnalysis(mockAnalysis);
      }
      setCurrentStep(2);
      
    } catch (error: any) {
      console.error('Meal analysis error:', error);
      
      // Check if it's a security block error
      if (error.response?.data?.security_scan?.blocked) {
        setSecurityBlocked(true);
        setSecurityError(error.response.data.details || error.response.data.error);
        setSecurityDetails(error.response.data.security_scan);
        setShowSecurityBanner(true);
      } else {
        toast.error('Failed to analyze meal');
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmAnalysis = async (confirmed: boolean) => {
    setUserConfirmed(confirmed);
    
    if (confirmed) {
      setCurrentStep(3);
      await generateFinalReport();
    } else {
      setCurrentStep(1);
      setAiAnalysis(null);
      toast('Please provide a more detailed description of your meal');
    }
  };

  const generateFinalReport = async () => {
    try {
      setIsConfirming(true);
      
      // Use the detailed analysis from step 2 and enhance it with nutritional data
      if (aiAnalysis && aiAnalysis.suggestedItems) {
        // Enhance each item with nutritional data using searchable terms
        const enhancedItems = await Promise.all(aiAnalysis.suggestedItems.map(async (item: any) => {
          // Try to get nutritional data using search terms for better accuracy
          const searchTerms = item.searchTerms || [item.name];
          let nutritionalData = null;
          
          // Try each search term to find the best nutritional data
          for (const searchTerm of searchTerms) {
            nutritionalData = getNutritionalDataForItem(searchTerm);
            if (nutritionalData && nutritionalData.calories > 0) {
              break; // Found good data, use it
            }
          }
          
          // If no specific data found, fall back to generic data
          if (!nutritionalData || nutritionalData.calories === 0) {
            nutritionalData = getNutritionalDataForItem(item.name);
          }
          
          // Scale nutritional data based on quantity
          const scaledNutritionalData = {
            calories: Math.round((nutritionalData?.calories || 0) * item.quantity),
            carbs: Math.round((nutritionalData?.carbs || 0) * item.quantity * 10) / 10, // Keep 1 decimal place
            protein: Math.round((nutritionalData?.protein || 0) * item.quantity * 10) / 10,
            fat: Math.round((nutritionalData?.fat || 0) * item.quantity * 10) / 10,
            saturatedFat: Math.round((nutritionalData?.saturatedFat || 0) * item.quantity * 10) / 10,
            fiber: Math.round((nutritionalData?.fiber || 0) * item.quantity * 10) / 10,
            sugar: Math.round((nutritionalData?.sugar || 0) * item.quantity * 10) / 10,
            sodium: Math.round((nutritionalData?.sodium || 0) * item.quantity),
            cholesterol: Math.round((nutritionalData?.cholesterol || 0) * item.quantity),
            potassium: Math.round((nutritionalData?.potassium || 0) * item.quantity),
            nutriScore: nutritionalData?.nutriScore || 'Unknown',
            foodType: nutritionalData?.foodType || 'Unknown',
            ingredients: nutritionalData?.ingredients || [],
            allergens: nutritionalData?.allergens || [],
            additives: nutritionalData?.additives || []
          };
          
          return {
            food_name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            description: item.description,
            searchTerms: item.searchTerms || [],
            brand: item.brand || 'Generic',
            category: item.category || 'Unknown',
            ...scaledNutritionalData
          };
        }));
        
        // Calculate totals
        const totals = enhancedItems.reduce((acc, item) => {
          acc.calories += (item.calories || 0);
          acc.carbs += (item.carbs || 0);
          acc.protein += (item.protein || 0);
          acc.fat += (item.fat || 0);
          acc.saturatedFat += (item.saturatedFat || 0);
          acc.fiber += (item.fiber || 0);
          acc.sugar += (item.sugar || 0);
          acc.sodium += (item.sodium || 0);
          acc.cholesterol += (item.cholesterol || 0);
          acc.potassium += (item.potassium || 0);
          return acc;
        }, { calories: 0, carbs: 0, protein: 0, fat: 0, saturatedFat: 0, fiber: 0, sugar: 0, sodium: 0, cholesterol: 0, potassium: 0 });
        
        // Create a comprehensive meal report with search metadata
        const meal = {
          name: `Meal - ${new Date().toLocaleDateString()}`,
          meal_type: 'lunch',
          date_time: new Date().toISOString(),
          items: enhancedItems,
          total_calories: Math.round(totals.calories),
          total_carbs: Math.round(totals.carbs),
          total_protein: Math.round(totals.protein),
          total_fat: Math.round(totals.fat),
          total_saturatedFat: Math.round(totals.saturatedFat * 10) / 10,
          total_fiber: Math.round(totals.fiber * 10) / 10,
          total_sugar: Math.round(totals.sugar * 10) / 10,
          total_sodium: Math.round(totals.sodium),
          total_cholesterol: Math.round(totals.cholesterol),
          total_potassium: Math.round(totals.potassium),
          nutritionScore: calculateOverallNutritionScore(totals),
          searchTerms: aiAnalysis.searchTerms || [],
          confirmed: true
        };

        setDetailedAnalysis(meal);
        setCurrentStep(4);
      } else {
        toast.error('No analysis data available');
      }
      
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate final report');
    } finally {
      setIsConfirming(false);
    }
  };

  const saveMeal = async () => {
    if (!detailedAnalysis) return;

    try {
      setLoading(true);
      
      // Add comments to the meal data
      const mealData = {
        ...detailedAnalysis,
        comments: comments.trim() || null
      };
      
      // Navigate to meal overview page with meal data
      navigate('/meal-overview', { state: { meal: mealData } });
      onClose();
      resetWorkflow();
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Failed to open meal overview');
    } finally {
      setLoading(false);
    }
  };

  const resetWorkflow = () => {
    setCurrentStep(1);
    setMealDescription('');
    setAiAnalysis(null);
    setUserConfirmed(false);
    setComments('');
    setDetailedAnalysis(null);
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return <Utensils className="w-6 h-6" />;
      case 2: return <Brain className="w-6 h-6" />;
      case 3: return <Calculator className="w-6 h-6" />;
      case 4: return <FileText className="w-6 h-6" />;
      default: return <Utensils className="w-6 h-6" />;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return 'Describe Your Meal';
      case 2: return 'AI Validation';
      case 3: return 'Calculating Nutrition';
      case 4: return 'Review & Save';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Add New Meal</h2>
            {openFoodFactsStatus === 'updating' && (
              <div className="flex items-center space-x-2 text-blue-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Updating food database...</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center p-4 bg-gray-50">
          <div className="flex items-center space-x-8">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {getStepIcon(step)}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${
                    step <= currentStep ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {getStepTitle(step)}
                  </p>

                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 mt-4 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {getStepTitle(currentStep)}
          </h3>

          {/* Step 1: Meal Description */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your meal in detail
                </label>
                <textarea
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  placeholder="Example: I had a grilled chicken breast (150g) with steamed broccoli (100g) and brown rice (1/2 cup). I also had a small apple and a glass of water."
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
                <p className="text-sm text-gray-600 mt-2">
                  Be as specific as possible about quantities, cooking methods, and ingredients.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={analyzeMeal}
                  disabled={loading || !mealDescription.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      <span>Analyze Meal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: AI Validation */}
          {currentStep === 2 && aiAnalysis && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">AI Analysis Results</h4>
                </div>
                
                <div className="space-y-4">
                  {/* User Information and Identified Meal */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>User Information:</strong>
                      </p>
                      <p className="text-sm text-blue-800 font-medium">
                        {aiAnalysis.userInformation || `User said: "${mealDescription}"`}
                      </p>
                    </div>
                    
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Identified Meal:</strong>
                      </p>
                      <p className="text-sm text-green-800 font-medium">
                        {aiAnalysis.identifiedMeal || 'Meal analysis'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Confidence and Understanding */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Confidence Level:</strong> {aiAnalysis.confidence}%
                      </p>
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Understood Items:</strong>
                      </p>
                      <ul className="text-sm text-blue-700 list-disc list-inside">
                        {aiAnalysis.understoodItems.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Meal Breakdown:</strong>
                      </p>
                      <div className="text-sm text-blue-700">
                        <p>{aiAnalysis.mealBreakdown}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Item Quantities and Details */}
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Item Quantities and Details:</strong>
                    </p>
                    <div className="space-y-2">
                      {aiAnalysis.suggestedItems.map((item, index) => (
                        <div key={index} className="border-l-2 border-blue-200 pl-3">
                          <p className="text-sm font-medium text-gray-900">
                            {item.name} - {item.quantity} {item.unit}
                          </p>
                          <p className="text-xs text-gray-600 mb-1">
                            {item.description}
                          </p>
                          {item.quantityDescription && (
                            <p className="text-xs text-blue-600 font-medium">
                              {item.quantityDescription}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-medium text-yellow-900">Please Confirm</h4>
                </div>
                <p className="text-sm text-yellow-800 mb-4">
                  Does this analysis accurately represent your meal? If not, we'll ask you to provide more details.
                </p>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => confirmAnalysis(false)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                  >
                    No, I need to clarify
                  </button>
                  <button
                    onClick={() => confirmAnalysis(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Yes, this is correct</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Calculating Nutrition */}
          {currentStep === 3 && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Calculating Detailed Nutrition
              </h4>
              <p className="text-gray-600">
                Analyzing ingredients, checking OpenFoodFacts database, and generating comprehensive nutritional report...
              </p>
            </div>
          )}

          {/* Step 4: Review & Save */}
          {currentStep === 4 && detailedAnalysis && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-green-900">Meal Analysis Complete</h4>
                </div>
                <p className="text-sm text-green-800">
                  Your meal has been analyzed and nutritional information has been calculated.
                </p>
              </div>

              {/* Nutritional Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{detailedAnalysis.total_calories}</p>
                  <p className="text-sm text-blue-800">Calories</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{detailedAnalysis.total_carbs}g</p>
                  <p className="text-sm text-green-800">Carbs</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{detailedAnalysis.total_protein}g</p>
                  <p className="text-sm text-purple-800">Protein</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{detailedAnalysis.total_fat}g</p>
                  <p className="text-sm text-orange-800">Fat</p>
                </div>
              </div>

              {/* Detailed Report */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Detailed Analysis</h5>
                
                {/* Individual Components */}
                <div className="space-y-4 text-sm mb-4">
                  <h6 className="font-medium text-gray-800 mb-2">Individual Components:</h6>
                  {detailedAnalysis.items?.map((item: any, index: number) => (
                    <div key={index} className="border-l-4 border-blue-200 pl-3 bg-white p-3 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{item.food_name}</p>
                          <p className="text-xs text-gray-500">{item.quantity} {item.unit}</p>
                        </div>
                        {item.nutriScore && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.nutriScore === 'A' ? 'bg-green-100 text-green-800' :
                            item.nutriScore === 'B' ? 'bg-blue-100 text-blue-800' :
                            item.nutriScore === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            item.nutriScore === 'D' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            Nutri-Score: {item.nutriScore}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 mb-2">
                        <span>Calories: {item.calories}</span>
                        <span>Carbs: {item.carbs}g</span>
                        <span>Protein: {item.protein}g</span>
                        <span>Fat: {item.fat}g</span>
                      </div>
                      
                      {item.foodType && (
                        <p className="text-xs text-gray-500 mb-1">
                          Food Type: {item.foodType}
                        </p>
                      )}
                      
                      {item.ingredients && item.ingredients.length > 0 && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Ingredients:</span> {item.ingredients.join(', ')}
                        </div>
                      )}
                      
                      {item.allergens && item.allergens.length > 0 && (
                        <div className="text-xs text-red-500 mt-1">
                          <span className="font-medium">Allergens:</span> {item.allergens.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Total Summary */}
                <div className="border-t pt-4">
                  <h6 className="font-medium text-gray-800 mb-2">Total Meal Summary:</h6>
                  
                  {/* Primary Macros */}
                  <div className="bg-blue-50 p-3 rounded mb-3">
                    <h6 className="text-sm font-medium text-gray-700 mb-2">Primary Macros</h6>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-blue-600">{detailedAnalysis.total_calories}</p>
                        <p className="text-xs text-blue-800">Calories (kcal)</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-green-600">{detailedAnalysis.total_carbs}g</p>
                        <p className="text-xs text-green-800">Carbohydrates</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-purple-600">{detailedAnalysis.total_protein}g</p>
                        <p className="text-xs text-purple-800">Protein</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-orange-600">{detailedAnalysis.total_fat}g</p>
                        <p className="text-xs text-orange-800">Total Fat</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Secondary Nutrients */}
                  <div className="bg-gray-50 p-3 rounded">
                    <h6 className="text-sm font-medium text-gray-600 mb-2">Additional Nutrients</h6>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                      <div className="text-center">
                        <p className="font-semibold text-gray-700">{detailedAnalysis.total_saturatedFat || 0}g</p>
                        <p className="text-gray-500">Saturated Fat</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-yellow-600">{detailedAnalysis.total_fiber || 0}g</p>
                        <p className="text-gray-500">Fiber</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-red-600">{detailedAnalysis.total_sugar || 0}g</p>
                        <p className="text-gray-500">Sugar</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-indigo-600">{detailedAnalysis.total_sodium || 0}mg</p>
                        <p className="text-gray-500">Sodium</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-pink-600">{detailedAnalysis.total_cholesterol || 0}mg</p>
                        <p className="text-gray-500">Cholesterol</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-teal-600">{detailedAnalysis.total_potassium || 0}mg</p>
                        <p className="text-gray-500">Potassium</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Nutrition Score and Levels Summary */}
                {detailedAnalysis.nutritionScore && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h6 className="font-medium text-gray-900 mb-2">Overall Nutrition Assessment</h6>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Overall Score:</span>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          detailedAnalysis.nutritionScore === 'A' ? 'bg-green-100 text-green-800' :
                          detailedAnalysis.nutritionScore === 'B' ? 'bg-blue-100 text-blue-800' :
                          detailedAnalysis.nutritionScore === 'C' ? 'bg-yellow-100 text-yellow-800' :
                          detailedAnalysis.nutritionScore === 'D' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {detailedAnalysis.nutritionScore}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Add Comments (Optional)</h5>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any notes about this meal (e.g., how it tasted, cooking method, special ingredients, etc.)"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={saveMeal}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>View & Save Meal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showSecurityBanner && <SecurityBanner error={securityError} details={securityDetails} onClose={() => setShowSecurityBanner(false)} />}
    </div>
  );
};

export default AddMealWorkflow;
