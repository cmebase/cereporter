import React from "react";

export default function ClassManagementLayout({ left, right }) {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6 min-h-[calc(100vh-160px)]">
      {/* Responsive: stacks on zoom/small screens, 2-col on large */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 h-full">
        
        {/* LEFT: Class List - fills viewport and scrolls internally */}
        <section className="bg-white border rounded-2xl shadow-sm flex flex-col min-h-[calc(100vh-160px)]">
          <div className="p-4 md:p-5 border-b shrink-0">
            {left?.header}
          </div>

          {/* Scrollable list area fills remaining space */}
          <div className="flex-1 overflow-y-auto px-4 md:px-5 pb-4">
            <div className="space-y-1">
              {left?.body}
            </div>
          </div>
        </section>

        {/* RIGHT: Actions - sticky on desktop */}
        <aside className="lg:sticky lg:top-6 h-fit">
          <div className="bg-white border rounded-2xl shadow-sm p-4 md:p-5">
            {right}
          </div>
        </aside>

      </div>
    </div>
  );
}