# 🏗️ MuseBar Architecture Guide

This document explains the proper architecture and coding standards for the MuseBar project after the major refactoring to follow React and TypeScript best practices.

## 📊 **Project Overview**

MuseBar is a Point of Sale (POS) system with French legal compliance features, built with:
- **Frontend**: React + TypeScript + Material-UI
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Architecture**: Clean, modular component-based design

## 🎯 **Architecture Principles**

### **1. Separation of Concerns**
Each file/component has a single, clear responsibility:
- **Components**: Only handle UI rendering and user interaction
- **Hooks**: Manage state and side effects
- **Services**: Handle API calls and external interactions
- **Utils**: Provide shared utility functions

### **2. Component Size Guidelines**
- **Maximum 200-300 lines** per component
- If larger, break into smaller, focused components
- Use composition over inheritance

### **3. TypeScript Consistency**
- **100% TypeScript** - no mixed JavaScript files
- Proper type definitions for all interfaces
- Type safety enforced throughout

## 🏗️ **Component Architecture**

### **Before (Bad Example)**
```
POS.tsx (2,235 lines) 😱
├── 15+ useState hooks
├── UI rendering
├── Business logic
├── API calls
├── Payment processing
├── Mobile responsiveness
└── Complex calculations
```

### **After (Good Example)**
```
📁 POS/
├── POSContainer.tsx (164 lines) ✅
├── ProductGrid.tsx (161 lines) ✅
├── OrderSummary.tsx (205 lines) ✅
├── CategoryFilter.tsx (112 lines) ✅
└── index.ts (exports)

📁 hooks/
├── usePOSState.ts (State management)
├── usePOSLogic.ts (Business logic)
└── usePOSAPI.ts (API calls)
```

## 🔧 **Custom Hooks Pattern**

We use custom hooks to extract logic from components:

### **State Management Hook**
```typescript
// usePOSState.ts
export const usePOSState = (): [POSState, POSActions] => {
  // All state variables
  // All state setters
  // Helper functions
  return [state, actions];
};
```

### **Business Logic Hook**
```typescript
// usePOSLogic.ts
export const usePOSLogic = (...dependencies): POSLogic => {
  // Calculations
  // Validations
  // Derived data
  return { ... };
};
```

### **API Hook**
```typescript
// usePOSAPI.ts
export const usePOSAPI = (...callbacks): POSAPIActions => {
  // API calls
  // Error handling
  // Success handling
  return { createOrder, processRetour, ... };
};
```

## 📦 **Component Composition**

### **Container Pattern**
```typescript
const POSContainer: React.FC<Props> = (props) => {
  // Hooks for state, logic, API
  const [state, actions] = usePOSState();
  const logic = usePOSLogic(...);
  const api = usePOSAPI(...);

  // Event handlers
  const handleSomething = () => { ... };

  // Render smaller components
  return (
    <Box>
      <CategoryFilter {...filterProps} />
      <ProductGrid {...gridProps} />
      <OrderSummary {...summaryProps} />
    </Box>
  );
};
```

### **Focused Components**
```typescript
const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onAddToOrder,
  ...otherProps
}) => {
  // Only UI logic here
  // No state management
  // No API calls
  // Just rendering and user interaction
  
  return (
    <Grid container>
      {products.map(product => (
        <ProductCard 
          key={product.id} 
          product={product}
          onClick={() => onAddToOrder(product)}
        />
      ))}
    </Grid>
  );
};
```

## 📋 **File Organization Standards**

### **Directory Structure**
```
src/
├── components/
│   ├── POS/                 # Feature-based grouping
│   │   ├── POSContainer.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── OrderSummary.tsx
│   │   ├── CategoryFilter.tsx
│   │   └── index.ts         # Exports
│   └── Common/              # Shared components
├── hooks/                   # Custom hooks
│   ├── usePOSState.ts
│   ├── usePOSLogic.ts
│   └── usePOSAPI.ts
├── services/                # API services
├── types/                   # TypeScript interfaces
└── utils/                   # Utility functions
```

### **Naming Conventions**
- **Components**: PascalCase (`ProductGrid.tsx`)
- **Hooks**: camelCase starting with `use` (`usePOSState.ts`)
- **Types**: PascalCase (`OrderItem`, `ProductGridProps`)
- **Files**: Match the main export (`ProductGrid.tsx` exports `ProductGrid`)

## ⚡ **Performance Best Practices**

### **1. Memoization**
```typescript
// Expensive calculations
const expensiveValue = useMemo(() => {
  return complexCalculation(dependencies);
}, [dependencies]);

// Event handlers
const handleClick = useCallback((id: string) => {
  // handler logic
}, [dependencies]);
```

### **2. Component Optimization**
```typescript
// When props don't change often
const ProductCard = React.memo<ProductCardProps>(({ product, onClick }) => {
  return <Card>...</Card>;
});
```

### **3. Code Splitting**
```typescript
// Lazy load heavy components
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

const App = () => (
  <Suspense fallback={<Loading />}>
    <HeavyComponent />
  </Suspense>
);
```

## 🧪 **Testing Strategy**

### **Component Testing**
```typescript
// ProductGrid.test.tsx
describe('ProductGrid', () => {
  it('should render products correctly', () => {
    const mockProducts = [/* test data */];
    render(<ProductGrid products={mockProducts} {...props} />);
    
    expect(screen.getByText('Product 1')).toBeInTheDocument();
  });

  it('should call onAddToOrder when product is clicked', () => {
    const mockOnAdd = jest.fn();
    render(<ProductGrid onAddToOrder={mockOnAdd} {...props} />);
    
    fireEvent.click(screen.getByText('Product 1'));
    expect(mockOnAdd).toHaveBeenCalledWith(expectedItem);
  });
});
```

### **Hook Testing**
```typescript
// usePOSState.test.ts
describe('usePOSState', () => {
  it('should add item to order', () => {
    const { result } = renderHook(() => usePOSState());
    
    act(() => {
      result.current[1].addToOrder(mockItem);
    });
    
    expect(result.current[0].currentOrder).toContain(mockItem);
  });
});
```

## 🚀 **Migration Guide**

### **Steps to Refactor Large Components**

1. **Identify Responsibilities**
   - State management
   - Business logic
   - API calls
   - UI rendering

2. **Extract Custom Hooks**
   - Create `useComponentState.ts`
   - Create `useComponentLogic.ts`
   - Create `useComponentAPI.ts`

3. **Break Down UI**
   - Identify logical UI sections
   - Create focused components (200-300 lines max)
   - Use composition

4. **Update Imports**
   - Create index files for clean exports
   - Update parent components to use new structure

## 📚 **Code Examples**

### **Bad: Giant Component**
```typescript
// ❌ DON'T DO THIS
const BadComponent = () => {
  const [state1, setState1] = useState();
  const [state2, setState2] = useState();
  // ... 15 more useState calls
  
  const handleComplexLogic = () => {
    // 100 lines of business logic
  };
  
  const handleAPI = async () => {
    // Direct API calls
    const response = await fetch('/api/endpoint');
    // Error handling
  };
  
  return (
    <div>
      {/* 1000+ lines of JSX */}
    </div>
  );
};
```

### **Good: Composed Components**
```typescript
// ✅ DO THIS
const GoodContainer = () => {
  const [state, actions] = useComponentState();
  const logic = useComponentLogic(state);
  const api = useComponentAPI(actions.showSuccess, actions.showError);
  
  return (
    <Box>
      <ComponentHeader {...headerProps} />
      <ComponentBody {...bodyProps} />
      <ComponentFooter {...footerProps} />
    </Box>
  );
};

const ComponentHeader = ({ title, onAction }) => (
  <Typography variant="h4">{title}</Typography>
);
```

## 🔍 **Code Review Checklist**

- [ ] Component under 300 lines
- [ ] Single responsibility
- [ ] TypeScript types defined
- [ ] Custom hooks for complex logic
- [ ] Proper error handling
- [ ] Memoization where appropriate
- [ ] Clear prop interfaces
- [ ] No direct API calls in components
- [ ] Consistent naming conventions
- [ ] Proper file organization

## 📈 **Benefits of This Architecture**

1. **Maintainability**: Easy to find and fix bugs
2. **Testability**: Each piece can be tested in isolation
3. **Reusability**: Components can be used elsewhere
4. **Readability**: Clear separation of concerns
5. **Performance**: Better optimization opportunities
6. **Collaboration**: Multiple developers can work on different pieces
7. **Type Safety**: TypeScript catches errors early

## 🎯 **Next Steps**

1. **Apply this pattern** to other large components (HistoryDashboard, ClosureBulletinDashboard)
2. **Create shared components** for common UI patterns
3. **Add comprehensive tests** for all components and hooks
4. **Implement error boundaries** for better error handling
5. **Add performance monitoring** to track improvements

---

Remember: **Small, focused, composable components are the key to maintainable React applications!** 