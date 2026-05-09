// "use client";

// import { useState, useEffect } from "react";
// // TODO: Dialog, Select, Label, and Alert components are missing. Use a third-party library or implement your own if needed.
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Table2, InfoIcon, HelpCircle } from "lucide-react";

// interface ColumnMappingDialogProps {
//   open: boolean;
//   onClose: () => void;
//   fileId: string;
//   availableColumns: string[];
//   suggestedMapping: Record<string, string>;
//   onSubmit: (mapping: Record<string, string>) => void;
// }

// export default function ColumnMappingDialog({
//   open,
//   onClose,
//   fileId,
//   availableColumns,
//   suggestedMapping,
//   onSubmit,
// }: ColumnMappingDialogProps) {
//   const [mapping, setMapping] = useState<Record<string, string>>({});
//   const [errors, setErrors] = useState<Record<string, string>>({});

//   useEffect(() => {
//     // Initialize with suggested mapping
//     setMapping(suggestedMapping);
//     setErrors({});
//   }, [suggestedMapping, open]);

//   const requiredColumns = ["source", "target", "timestamp"];
//   const optionalColumns = ["weight"];

//   const handleChange = (column: string, value: string) => {
//     setMapping((prev) => ({ ...prev, [column]: value }));

//     // Clear error for this column if it was set
//     if (errors[column]) {
//       setErrors((prev) => {
//         const newErrors = { ...prev };
//         delete newErrors[column];
//         return newErrors;
//       });
//     }
//   };

//   const validateMapping = (): boolean => {
//     const newErrors: Record<string, string> = {};

//     for (const col of requiredColumns) {
//       if (!mapping[col] || mapping[col] === "") {
//         newErrors[col] = `${col} column is required`;
//       }
//     }

//     // Check for duplicate mappings
//     const usedColumns = Object.values(mapping).filter((v) => v && v !== "");
//     const duplicates = usedColumns.filter(
//       (col, index) => usedColumns.indexOf(col) !== index,
//     );

//     if (duplicates.length > 0) {
//       newErrors.general = `Cannot map multiple fields to the same column: ${duplicates.join(", ")}`;
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = () => {
//     if (validateMapping()) {
//       onSubmit(mapping);
//     }
//   };

//   const getAutoGenerateOption = (column: string) => {
//     if (column === "timestamp") {
//       return (
//         <SelectItem value="__generate__">
//           🔄 Auto-generate timestamps
//         </SelectItem>
//       );
//     }
//     return null;
//   };

//   return (
//     <Dialog open={open} onOpenChange={onClose}>
//       <DialogContent className="sm:max-w-[600px]">
//         <DialogHeader>
//           <DialogTitle className="flex items-center gap-2">
//             <Table2 className="h-5 w-5" />
//             Map Your Columns
//           </DialogTitle>
//           <DialogDescription>
//             We couldn't automatically detect the required columns. Please map
//             your data columns to the required fields.
//           </DialogDescription>
//         </DialogHeader>

//         <div className="space-y-4 py-4">
//           <Alert>
//             <InfoIcon className="h-4 w-4" />
//             <AlertTitle>File Information</AlertTitle>
//             <AlertDescription>
//               File ID: {fileId} • Available columns: {availableColumns.length}
//             </AlertDescription>
//           </Alert>

//           <div className="flex flex-wrap gap-1 mb-2">
//             {availableColumns.map((col) => (
//               <Badge key={col} variant="outline" className="text-xs">
//                 {col}
//               </Badge>
//             ))}
//           </div>

//           <div className="space-y-4">
//             <div className="text-sm font-medium">Required Columns</div>

//             {requiredColumns.map((col) => (
//               <div key={col} className="grid grid-cols-4 items-center gap-4">
//                 <Label htmlFor={col} className="text-right capitalize">
//                   {col} <span className="text-red-500">*</span>
//                 </Label>
//                 <div className="col-span-3">
//                   <Select
//                     value={mapping[col] || ""}
//                     onValueChange={(value: string) => handleChange(col, value)}
//                   >
//                     <SelectTrigger
//                       className={errors[col] ? "border-red-500" : ""}
//                     >
//                       <SelectValue placeholder={`Select ${col} column`} />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="">None</SelectItem>
//                       {availableColumns.map((availCol) => (
//                         <SelectItem key={availCol} value={availCol}>
//                           {availCol}
//                         </SelectItem>
//                       ))}
//                       {getAutoGenerateOption(col)}
//                     </SelectContent>
//                   </Select>
//                   {errors[col] && (
//                     <p className="text-xs text-red-500 mt-1">{errors[col]}</p>
//                   )}
//                 </div>
//               </div>
//             ))}

//             <div className="text-sm font-medium mt-4">Optional Columns</div>

//             {optionalColumns.map((col) => (
//               <div key={col} className="grid grid-cols-4 items-center gap-4">
//                 <Label htmlFor={col} className="text-right capitalize">
//                   {col}
//                 </Label>
//                 <div className="col-span-3">
//                   <Select
//                     value={mapping[col] || ""}
//                     onValueChange={(value: string) => handleChange(col, value)}
//                   >
//                     <SelectTrigger>
//                       <SelectValue
//                         placeholder={`Select ${col} column (optional)`}
//                       />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="">None (use default)</SelectItem>
//                       {availableColumns.map((availCol) => (
//                         <SelectItem key={availCol} value={availCol}>
//                           {availCol}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {errors.general && (
//             <Alert variant="destructive">
//               <HelpCircle className="h-4 w-4" />
//               <AlertTitle>Mapping Error</AlertTitle>
//               <AlertDescription>{errors.general}</AlertDescription>
//             </Alert>
//           )}

//           <div className="bg-muted p-3 rounded-lg">
//             <p className="text-xs text-muted-foreground mb-2">
//               Data Format Example:
//             </p>
//             <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
//               source,target,timestamp,weight node1,node2,2024-01-01 10:00:00,1.5
//               node2,node3,2024-01-01 10:05:00,2.0
//             </pre>
//           </div>
//         </div>

//         <DialogFooter>
//           <Button variant="outline" onClick={onClose}>
//             Cancel
//           </Button>
//           <Button onClick={handleSubmit}>Start Analysis</Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }
