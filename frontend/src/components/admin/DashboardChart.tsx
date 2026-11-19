"use client"

import { useEffect, useRef, useState } from "react"

// Biểu đồ cột ngang ở trang tổng quan (thư viện ApexCharts, chỉ tải ở trang tổng quan)
// chart: { labels: ["Mì - Bún - Phở", ...], values: [12, ...] }
export function DashboardChart({ chart }: { chart: { labels: string[], values: number[] } }) {
  const { labels, values } = chart
  const elementRef = useRef<HTMLDivElement>(null)
  // Không tải được thư viện biểu đồ thì hiện dạng danh sách
  const [isFallback, setIsFallback] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if(!element || values.length === 0) return
    let instance: any = null
    let isCancelled = false

    import("apexcharts").then((module) => {
      if(isCancelled) return
      const ApexCharts: any = module.default

      // Màu theo giao diện sáng / tối đang chọn
      const isDarkTheme = document.documentElement.getAttribute("data-bs-theme") === "dark"
      const chartTextColor = getComputedStyle(document.body).getPropertyValue("--bs-secondary-color").trim() || "#8997bd"
      const chartBarColor = isDarkTheme ? "#3987e5" : "#2a78d6"

      instance = new ApexCharts(element, {
        chart: {
          type: "bar",
          height: labels.length * 36 + 30, // mỗi cột cao khoảng 36px
          toolbar: { show: false },
          fontFamily: "inherit",
          foreColor: chartTextColor,
          background: "transparent"
        },
        series: [{ name: "Số sản phẩm", data: values }],
        colors: [chartBarColor],
        plotOptions: {
          bar: {
            horizontal: true,
            barHeight: "60%",
            borderRadius: 4,
            borderRadiusApplication: "end",
            dataLabels: { position: "top" }
          }
        },
        // Số sản phẩm ở cuối mỗi cột
        dataLabels: {
          enabled: true,
          offsetX: 22,
          style: { colors: [chartTextColor], fontWeight: 500 }
        },
        // Số đã hiện ở cuối mỗi cột nên ẩn trục số, chừa 20% bên phải để số không đè lên cột dài nhất
        xaxis: {
          categories: labels,
          max: Math.max(...values) * 1.2,
          labels: { show: false },
          axisBorder: { show: false },
          axisTicks: { show: false }
        },
        yaxis: { labels: { maxWidth: 160 } },
        grid: {
          xaxis: { lines: { show: false } },
          yaxis: { lines: { show: false } },
          padding: { top: -10, bottom: -10 }
        },
        tooltip: {
          theme: isDarkTheme ? "dark" : "light",
          y: { formatter: (value: number) => `${value} sản phẩm` }
        },
        legend: { show: false }
      })
      instance.render()
    }).catch(() => {
      if(!isCancelled) setIsFallback(true)
    })

    return () => {
      isCancelled = true
      instance?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if(values.length === 0) {
    return <p className="text-muted text-center my-4">Chưa có sản phẩm</p>
  }

  if(isFallback) {
    return (
      <div>
        {labels.map((label, index) => (
          <div className="d-flex justify-content-between border-bottom py-1" key={label}>
            <span>{label}</span>
            <span className="fw-semibold">{values[index]}</span>
          </div>
        ))}
      </div>
    )
  }

  return <div ref={elementRef}></div>
}
