import { useMemo, useState } from "react";
import { LayoutGrid, Search, Table2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal";
import {
  INITIAL_ORDERS,
  PRIORITY_META,
  STATUS_META,
  formatCurrencyArs,
} from "@/data/ordersData";

export default function Orders() {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [priorityFilter, setPriorityFilter] = useState("todas");
  const [viewMode, setViewMode] = useState("table");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const metrics = useMemo(() => {
    const active = orders.filter((order) => order.status !== "Completada").length;
    const critical = orders.filter(
      (order) => order.priority === "Crítica" && order.status !== "Completada"
    ).length;
    const completed = orders.filter((order) => order.status === "Completada").length;
    const activeBudget = orders
      .filter((order) => order.status !== "Completada")
      .reduce((acc, order) => acc + order.costEstimate, 0);

    return { active, critical, completed, activeBudget };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        order.id.toLowerCase().includes(term) ||
        order.deviceId.toLowerCase().includes(term) ||
        order.model.toLowerCase().includes(term) ||
        order.location.toLowerCase().includes(term) ||
        order.supplier.toLowerCase().includes(term) ||
        order.diagnosis.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "todos" || order.status === statusFilter;
      const matchesPriority =
        priorityFilter === "todas" || order.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [orders, searchTerm, statusFilter, priorityFilter]);

  const hasActiveFilters =
    searchTerm.trim() !== "" || statusFilter !== "todos" || priorityFilter !== "todas";

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("todos");
    setPriorityFilter("todas");
  };

  const handleAdvanceStatus = (orderId, nextStage) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: nextStage,
              scheduledWindow:
                nextStage === "Completada"
                  ? "Finalizada hoy"
                  : order.scheduledWindow,
            }
          : order
      )
    );
  };

  const selectClass =
    "bg-white dark:bg-[#0b1120] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl";
  const selectContentClass =
    "bg-white dark:bg-[#0b1120] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 z-50";

  return (
    <div className="flex-1 p-4 sm:p-6 lg:px-12 max-w-[1440px] w-full mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Órdenes de reparación
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Seguimiento de solicitudes técnicas, presupuestos y proveedores asignados.
          </p>
        </div>

        <div className="hidden md:inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 p-1">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "table"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Tabla</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "cards"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Tarjetas</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricBox label="Órdenes activas" value={metrics.active} />
        <MetricBox
          label="Prioridad crítica"
          value={metrics.critical}
          valueClass={
            metrics.critical > 0 ? "text-red-600 dark:text-red-400" : undefined
          }
        />
        <MetricBox label="Completadas" value={metrics.completed} />
        <MetricBox
          label="Presupuesto en curso"
          value={formatCurrencyArs(metrics.activeBudget)}
          mono
        />
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Buscar por orden, equipo, proveedor o diagnóstico..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className={`pl-9 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${selectClass}`}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={`w-full sm:w-[195px] ${selectClass}`}>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="Cotización aprobada">Cotización aprobada</SelectItem>
              <SelectItem value="Técnico asignado">Técnico asignado</SelectItem>
              <SelectItem value="Completada">Completada</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className={`w-full sm:w-[175px] ${selectClass}`}>
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <SelectItem value="todas">Todas las prioridades</SelectItem>
              <SelectItem value="Crítica">Prioridad crítica</SelectItem>
              <SelectItem value="Alta">Prioridad alta</SelectItem>
              <SelectItem value="Normal">Prioridad normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-[#0b1120]/50 p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No hay órdenes que coincidan con los filtros aplicados.
          </p>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="rounded-lg border-slate-300 dark:border-slate-700 text-xs"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          {viewMode === "table" && (
            <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/70">
                  <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Orden
                    </TableHead>
                    <TableHead className="px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Equipo
                    </TableHead>
                    <TableHead className="px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Diagnóstico
                    </TableHead>
                    <TableHead className="px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Proveedor
                    </TableHead>
                    <TableHead className="px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Prioridad
                    </TableHead>
                    <TableHead className="px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Estado
                    </TableHead>
                    <TableHead className="px-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Estimación
                    </TableHead>
                    <TableHead className="px-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Detalle
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const statusStyle = STATUS_META[order.status];
                    const priorityStyle = PRIORITY_META[order.priority];
                    return (
                      <TableRow
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className="cursor-pointer border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                      >
                        <TableCell className="px-4 py-3.5 align-top">
                          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                            {order.id}
                          </span>
                          <span className="block font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {order.createdAt}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top">
                          <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                            {order.deviceId}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {order.model}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top max-w-[260px]">
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                            {order.diagnosis}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {order.location}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top">
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {order.supplier}
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {order.scheduledWindow}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${priorityStyle}`}
                          >
                            {order.priority}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${statusStyle?.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusStyle?.dot}`} />
                            {order.status}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top text-right font-mono text-xs font-semibold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                          {formatCurrencyArs(order.costEstimate)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedOrderId(order.id);
                            }}
                            className="h-7 rounded-lg border-slate-300 dark:border-slate-700 text-xs"
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div
            className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${
              viewMode === "table" ? "md:hidden" : ""
            }`}
          >
            {filteredOrders.map((order) => {
              const statusStyle = STATUS_META[order.status];
              const priorityStyle = PRIORITY_META[order.priority];
              return (
                <article
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] p-4 space-y-3.5 cursor-pointer transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                      {order.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${priorityStyle}`}
                      >
                        {order.priority}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusStyle?.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusStyle?.dot}`} />
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {order.diagnosis}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-mono">{order.deviceId}</span> · {order.model}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {order.location}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Proveedor
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate block">
                        {order.supplier}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Estimación
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrencyArs(order.costEstimate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{order.createdAt}</span>
                    <span className="font-medium text-[#034AAD] dark:text-blue-400">
                      Ver detalle
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <OrderDetailModal
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrderId(null)}
        onAdvanceStatus={handleAdvanceStatus}
      />
    </div>
  );
}

function MetricBox({ label, value, valueClass = "text-slate-900 dark:text-white", mono = false }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] px-5 py-4">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <p
        className={`mt-1 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${
          mono ? "font-mono text-xl sm:text-2xl" : ""
        } ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}
