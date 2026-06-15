/* ═══════════════════════════════════════════════════════════════
   app.js – Interaktivna vizualizacija prodaje kozmetike 2025.
   Student: Marta Lenić, DRD

   KORIŠTENI IZVORI:
   [1] D3.js – Data-Driven Documents, M. Bostock et al.
       https://d3js.org
       Korišteno: sve D3 funkcije (skale, osi, animacije, rollups)

   [2] Observable D3 Gallery, M. Bostock
       https://observablehq.com/@d3/gallery
       Korišteno: tehnika animacije linijskog grafikona (stroke-dashoffset)

   [3] D3 Graph Gallery – Donut Chart, Y. Holtz
       https://d3-graph-gallery.com/donut.html
       Korišteno: obrazac prstenastog grafikona s innerRadius i tekstom u sredini

   [4] D3 Graph Gallery – Lollipop Chart, Y. Holtz
       https://d3-graph-gallery.com/lollipop.html
       Korišteno: kombinacija line + circle s animiranim rastom iz ishodišta

   [5] D3 Graph Gallery – Radar / Spider Chart, Y. Holtz
       https://d3-graph-gallery.com/spider.html
       Korišteno: algoritam kutova osi i projiciranje normaliziranih vrijednosti

   [6] Makeup Sales in 2025 dataset, A. E. Syed
       https://www.kaggle.com/datasets/syedaeman2212/makeup-sales-in-2025
       Korišteno: izvorni skup podataka (500 transakcija, 10 atributa)
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   TOOLTIP – prikaz informacija na hover
   ───────────────────────────────────────────────────────────── */

const tip = d3.select("#tip");

const showTip = (html, e) => {
  tip
    .html(html)
    .style("opacity", 1)
    .style("left",   (e.clientX + 14) + "px")
    .style("top",    (e.clientY + 14) + "px");
};

const moveTip = (e) => {
  tip
    .style("left", (e.clientX + 14) + "px")
    .style("top",  (e.clientY + 14) + "px");
};

const hideTip = () => tip.style("opacity", 0);


/* ─────────────────────────────────────────────────────────────
   FORMATIRANJE BROJEVA
   ───────────────────────────────────────────────────────────── */

const fmt$  = d3.format("$,.0f");
const fmtN  = d3.format(",.0f");

const fmt$k = (d) => {
  if      (d >= 1_000_000) return "$" + (d / 1_000_000).toFixed(2) + "M";
  else if (d >= 1_000)     return "$" + (d / 1_000).toFixed(1)     + "k";
  else                     return "$" + d.toFixed(0);
};


/* ─────────────────────────────────────────────────────────────
   BOJE
   ───────────────────────────────────────────────────────────── */

const BRAND_COLORS = {
  "Fenty Beauty" : "#d2b26d",
  "L'Oreal"      : "#b260d8",
  "Maybelline"   : "#ea68b8",
  "MAC"          : "#7a5af5",
  "Estee Lauder" : "#6E8B74",
  "Dior"         : "#56e6d5",
  "Huda Beauty"  : "#b03052",
  "NARS"         : "#e77a32",
};

const brandColor = (b) => BRAND_COLORS[b] || "#ff6b9d";

const brandRamp = (base, n) => {
  const c     = d3.hsl(base);
  const s     = Math.min(0.9, Math.max(0.4, c.s));
  const light = d3.hsl(c.h, s, Math.min(0.86, c.l + 0.28));
  const dark  = d3.hsl(c.h, s, Math.max(0.30, c.l - 0.25));
  return d3.quantize(d3.interpolateHcl(light, dark), Math.max(n, 3));
};


/* ─────────────────────────────────────────────────────────────
   UČITAVANJE PODATAKA
   ───────────────────────────────────────────────────────────── */

d3.csv("makeup_sales_dataset_2025.csv", (d) => ({
  id      : Number(d.Sale_ID),
  date    : new Date(d.Date),
  brand   : d.Brand,
  product : d.Product_Type,
  country : d.Country,
  channel : d.Sales_Channel,
  payment : d.Payment_Method,
  price   : Number(d.Price_USD),
  units   : Number(d.Units_Sold),
  revenue : Number(d.Revenue_USD),
}))
.then((data) => {

  const byBrand = d3.rollups(
      data,
      (v) => ({
        revenue : d3.sum(v, (d) => d.revenue),
        units   : d3.sum(v, (d) => d.units),
        orders  : v.length,
      }),
      (d) => d.brand
    )
    .map(([brand, vals]) => ({ brand, ...vals }))
    .sort((a, b) => d3.descending(a.revenue, b.revenue));


  /* ── 1. BRAND BAR CHART ──────────────────────────────────── */

  (function () {
    const svg = d3.select("#chartBrands");
    const W   = 1100, H = 320;
    const m   = { t: 10, r: 24, b: 50, l: 130 };

    const x = d3.scaleLinear()
      .domain([0, d3.max(byBrand, (d) => d.revenue) * 1.05])
      .range([m.l, W - m.r]);

    const y = d3.scaleBand()
      .domain(byBrand.map((d) => d.brand))
      .range([m.t, H - m.b])
      .padding(0.22);

    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).ticks(9).tickFormat(fmt$k));

    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).tickSize(0));

    svg.append("text")
      .attr("x", (m.l + W - m.r) / 2)
      .attr("y", H - m.b + 38)
      .attr("text-anchor", "middle")
      .attr("fill", "#c9aed8")
      .attr("font-size", 11)
      .text("Revenue (USD)");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(m.t + (H - m.b - m.t) / 2))
      .attr("y", 14)
      .attr("text-anchor", "middle")
      .attr("fill", "#c9aed8")
      .attr("font-size", 11)
      .text("Brand");

    const bars = svg.selectAll(".bar")
      .data(byBrand)
      .join("rect")
        .attr("class", "bar")
        .attr("x", m.l)
        .attr("y", (d) => y(d.brand))
        .attr("height", y.bandwidth())
        .attr("rx", 6)
        .attr("fill", (d) => brandColor(d.brand))
        .attr("width", 0)
        .on("mousemove", (e, d) => {
          showTip(
            `<b>${d.brand}</b><br>
             Revenue: ${fmt$(d.revenue)}<br>
             Units: ${fmtN(d.units)}<br>
             Orders: ${d.orders}`,
            e
          );
          moveTip(e);
        })
        .on("mouseleave", hideTip);

    bars.transition()
      .duration(900)
      .attr("width", (d) => x(d.revenue) - m.l);

    svg.selectAll(".lbl")
      .data(byBrand)
      .join("text")
        .attr("x", (d) => x(d.revenue) + 8)
        .attr("y", (d) => y(d.brand) + y.bandwidth() / 2 + 4)
        .attr("fill", "#fff")
        .attr("font-size", 12)
        .attr("font-weight", 600)
        .attr("opacity", 0)
        .text((d) => fmt$k(d.revenue))
        .transition()
          .delay((d, i) => i * 60 + 600)
          .duration(400)
          .attr("opacity", 1);
  })();


  /* ── 2. MONTHLY TREND ────────────────────────────────────── */

  (function () {
    const months = d3.range(1, 13);
    const brands = byBrand.map((d) => d.brand);

    const brandRows = brands.map((b) => ({
      brand : b,
      vals  : months.map((mo) => ({
        mo,
        v : d3.sum(
          data.filter((d) => d.brand === b && d.date.getMonth() + 1 === mo),
          (d) => d.revenue
        ),
      })),
    }));

    const W   = 1200, H = 360;
    const m   = { t: 20, r: 24, b: 50, l: 72 };
    const svg = d3.select("#chartTrend");

    const x = d3.scalePoint()
      .domain(months)
      .range([m.l, W - m.r])
      .padding(0.2);

    const yMax = d3.max(brandRows, (b) => d3.max(b.vals, (v) => v.v));

    const y = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .range([H - m.b, m.t]);

    const line = d3.line()
      .x((d) => x(d.mo))
      .y((d) => y(d.v))
      .curve(d3.curveCatmullRom);

    svg.append("g")
      .selectAll("line.grid")
      .data(y.ticks(5))
      .join("line")
        .attr("class", "grid")
        .attr("x1", m.l)   
        .attr("x2", W - m.r)
        .attr("y1", (d) => y(d))
        .attr("y2", (d) => y(d))
        .attr("stroke", "rgba(255,255,255,.05)");

    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${H - m.b})`)
      .call(
        d3.axisBottom(x).tickFormat(
          (mo) => d3.timeFormat("%b")(new Date(2025, mo - 1, 1))
        )
      );

    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(fmt$k));

    svg.append("text")
      .attr("x", (m.l + W - m.r) / 2)
      .attr("y", H - m.b + 38)
      .attr("text-anchor", "middle")
      .attr("fill", "#c9aed8")
      .attr("font-size", 11)
      .text("Month");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(m.t + (H - m.b - m.t) / 2))
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("fill", "#c9aed8")
      .attr("font-size", 11)
      .text("Revenue (USD)");

/*Animacija crtanja linija tehnikom stroke-dashoffset
  Izvor: Observable D3 Gallery – https://observablehq.com/@d3/gallery*/
    brandRows.forEach((b, i) => {
      const col = brandColor(b.brand);
      const safeName = b.brand.replace(/\W/g, "_");

      const path = svg.append("path")
        .datum(b.vals)
        .attr("fill", "none")
        .attr("class", `trend-line trend-${safeName}`)
        .attr("stroke", col)
        .attr("stroke-width", 2.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line)
        .attr("opacity", 0);

      const totalLen = path.node().getTotalLength();

      path
        .attr("stroke-dasharray",  `${totalLen} ${totalLen}`)
        .attr("stroke-dashoffset", totalLen)
        .attr("opacity", 1)
        .transition()
          .duration(1200)
          .delay(i * 80)
          .attr("stroke-dashoffset", 0);

      svg.selectAll(`.dot-${i}`)
        .data(b.vals)
        .join("circle")
          .attr("class", `dot-${i} trend-dot trend-${safeName}`)
          .attr("cx", (d) => x(d.mo))
          .attr("cy", (d) => y(d.v))
          .attr("r", 3)
          .attr("fill", col)
          .attr("stroke", "rgba(0,0,0,.4)")
          .attr("stroke-width", 1)
          .attr("opacity", 0)
          .on("mousemove", (e, d) => {
            showTip(
              `<b>${b.brand}</b><br>
               ${d3.timeFormat("%B")(new Date(2025, d.mo - 1, 1))}: ${fmt$(d.v)}`,
              e
            );
            moveTip(e);
          })
          .on("mouseleave", hideTip)
          .transition()
            .delay(i * 80 + 1000)
            .duration(300)
            .attr("opacity", 1);
    });

    let activeBrand = null;
    const leg = d3.select("#trendLegend");

    brands.forEach((b) => {
      const safeName = b.replace(/\W/g, "_");

      leg.append("span")
        .attr("class", "leg-item")
        .html(`<i style="background:${brandColor(b)}"></i>${b}`)
        .style("cursor", "pointer")
        .on("click", function () {
          if (activeBrand === b) {
            activeBrand = null;
            svg.selectAll(".trend-line").transition().duration(300).attr("opacity", 1).attr("stroke-width", 2.5);
            svg.selectAll(".trend-dot").transition().duration(300).attr("opacity", 1).attr("r", 3);
            leg.selectAll(".leg-item").transition().duration(300).style("opacity", 1);
          } else {
            activeBrand = b;
            svg.selectAll(".trend-line").transition().duration(300).attr("opacity", 0.08).attr("stroke-width", 1.5);
            svg.selectAll(".trend-dot").transition().duration(300).attr("opacity", 0.08).attr("r", 2);
            leg.selectAll(".leg-item").transition().duration(300).style("opacity", 0.35);

            svg.selectAll(`.trend-${safeName}`).filter(".trend-line").transition().duration(300).attr("opacity", 1).attr("stroke-width", 3.5);
            svg.selectAll(`.trend-${safeName}`).filter(".trend-dot") .transition().duration(300).attr("opacity", 1).attr("r", 4);
            d3.select(this).transition().duration(300).style("opacity", 1);
          }
        });
    });
  })();


  /* ── 3. BRAND EXPLORER ───────────────────────────────────── */

  const selBrand = d3.select("#selBrand");
  byBrand.forEach((b) =>
    selBrand.append("option").attr("value", b.brand).text(b.brand)
  );
  selBrand.property("value", byBrand[0].brand);

  function drawExplorer() {
    const brand = selBrand.property("value");
    const bd = data.filter((d) => d.brand === brand);
    const brandCol = brandColor(brand);

    /* A — Products units */
    {
      const byProduct = d3
        .rollups(bd, (v) => d3.sum(v, (d) => d.units), (d) => d.product)
        .map(([k, v]) => ({ k, v }))
        .sort((a, b) => d3.descending(a.v, b.v));

      const svg = d3.select("#chartProducts");
      svg.selectAll("*").remove();
      d3.select("#productLegend").html("");

      const W  = 400, H = 340, cx = W / 2, cy = H / 2;
      const r  = Math.min(W, H) / 2 - 26;

      const colScale = d3.scaleOrdinal()
        .domain(byProduct.map((d) => d.k))
        .range(brandRamp(brandCol, byProduct.length).reverse());

      const totalU = d3.sum(byProduct, (d) => d.v);

   /*Prstenasti grafikon s innerRadius i tekstom u sredini
     Izvor: D3 Graph Gallery – https://d3-graph-gallery.com/donut.html */
      const pie  = d3.pie().sort(null).value((d) => d.v);
      const arc  = d3.arc().innerRadius(r * 0.54).outerRadius(r).padAngle(0.016).cornerRadius(4);
      const arcH = d3.arc().innerRadius(r * 0.54).outerRadius(r + 8).padAngle(0.016).cornerRadius(4);

      const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

      g.selectAll("path")
        .data(pie(byProduct))
        .join("path")
          .attr("fill", (d) => colScale(d.data.k))
          .attr("d", arc)
          .style("filter", "drop-shadow(0 2px 8px rgba(0,0,0,.4))")
          .on("mousemove", (e, d) => {
            d3.select(e.currentTarget).transition().duration(100).attr("d", arcH);
            showTip(
              `<b>${d.data.k}</b><br>
               ${fmtN(d.data.v)} units · ${(d.data.v / totalU * 100).toFixed(1)}%`,
              e
            );
            moveTip(e);
          })
          .on("mouseleave", (e) => {
            d3.select(e.currentTarget).transition().duration(100).attr("d", arc);
            hideTip();
          })
          .transition()
            .duration(700)
            .attrTween("d", function (d) {
              const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
              return (t) => arc(i(t));
            });

      g.append("text")
        .attr("text-anchor", "middle").attr("dy", -8)
        .attr("fill", "#c2a4c9").attr("font-size", 10).attr("letter-spacing", 2)
        .text("UNITS SOLD");

      g.append("text")
        .attr("text-anchor", "middle").attr("dy", 16)
        .attr("fill", "#fff").attr("font-size", 20)
        .attr("font-family", "Playfair Display").attr("font-weight", 700)
        .text(fmtN(totalU));

      d3.select("#productLegend")
        .selectAll("span")
        .data(byProduct)
        .join("span")
          .html((d) =>
            `<i style="background:${colScale(d.k)}"></i>${d.k} · ${(d.v / totalU * 100).toFixed(1)}%`
          );
    }

    /* B — Orders by channel + payment */
    {
      const channels = [...new Set(data.map((d) => d.channel))].sort();
      const payments = [...new Set(data.map((d) => d.payment))].sort();

      const pmScale = d3.scaleOrdinal()
        .domain(payments)
        .range(brandRamp(brandCol, payments.length));

      const matrix = channels.map((ch) => ({
        ch,
        vals : payments.map((pm) => ({
          pm,
          n : bd.filter((d) => d.channel === ch && d.payment === pm).length,
        })),
      }));

      const svg = d3.select("#chartOrders");
      svg.selectAll("*").remove();
      d3.select("#ordersLegend").html("");

      const W = 420, H = 300;
      const m = { t: 16, r: 14, b: 52, l: 44 };

      const x0   = d3.scaleBand().domain(channels).range([m.l, W - m.r]).padding(0.2);
      const x1   = d3.scaleBand().domain(payments).rangeRound([0, x0.bandwidth()]).padding(0.05);
      const yMax = d3.max(matrix, (ch) => d3.max(ch.vals, (v) => v.n));
      const y    = d3.scaleLinear().domain([0, yMax * 1.14]).range([H - m.b, m.t]);

      svg.append("g")
        .attr("class", "axis")
        .selectAll("line")
        .data(y.ticks(4))
        .join("line")
          .attr("x1", m.l).attr("x2", W - m.r)
          .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
          .attr("stroke", "rgba(255,255,255,.05)");

      svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${H - m.b})`)
        .call(d3.axisBottom(x0).tickSize(0))
        .select(".domain").remove();

      svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${m.l},0)`)
        .call(d3.axisLeft(y).ticks(4).tickSize(0))
        .select(".domain").remove();

      svg.append("text")
        .attr("x", (m.l + W - m.r) / 2).attr("y", H - m.b + 38)
        .attr("text-anchor", "middle").attr("fill", "#c2a4c9").attr("font-size", 10)
        .text("Sales Channel");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(m.t + (H - m.b - m.t) / 2)).attr("y", 12)
        .attr("text-anchor", "middle").attr("fill", "#c2a4c9").attr("font-size", 10)
        .text("Number of Orders");

      const chg = svg.selectAll(".chg")
        .data(matrix)
        .join("g")
          .attr("class", "chg")
          .attr("transform", (d) => `translate(${x0(d.ch)},0)`);

      chg.selectAll("rect")
        .data((d) => d.vals)
        .join("rect")
          .attr("x", (d) => x1(d.pm))
          .attr("width", x1.bandwidth())
          .attr("rx", 3)
          .attr("fill", (d) => pmScale(d.pm))
          .attr("fill-opacity", 0.86)
          .attr("y", H - m.b)
          .attr("height", 0)
          .on("mousemove", (e, d) => {
            showTip(`<b>${d.pm}</b><br>${d.n} orders`, e);
            moveTip(e);
          })
          .on("mouseleave", hideTip)
          .transition()
            .duration(650)
            .delay((d, i) => i * 35)
            .attr("y", (d) => y(d.n))
            .attr("height", (d) => Math.max(0, H - m.b - y(d.n)));

      chg.selectAll(".vl")
        .data((d) => d.vals)
        .join("text")
          .attr("class", "vl")
          .attr("x", (d) => x1(d.pm) + x1.bandwidth() / 2)
          .attr("text-anchor",  "middle")
          .attr("fill", "#f4e9ff").attr("font-size", 8).attr("font-weight", 600)
          .attr("y", (d) => y(d.n) - 4)
          .attr("opacity", 0)
          .text((d) => d.n > 0 ? d.n : "")
          .transition()
            .delay((d, i) => i * 35 + 450)
            .duration(250)
            .attr("opacity", 1);

      const leg = d3.select("#ordersLegend");
      payments.forEach((pm) =>
        leg.append("span").html(`<i style="background:${pmScale(pm)}"></i>${pm}`)
      );
    }

    /* C — Revenue by country */
    {
      const byCountry = d3
        .rollups(bd, (v) => d3.sum(v, (d) => d.revenue), (d) => d.country)
        .map(([k, v]) => ({ k, v }))
        .sort((a, b) => d3.descending(a.v, b.v));

      const svg = d3.select("#chartCountries");
      svg.selectAll("*").remove();

      const W = 380, H = 300;
      const m = { t: 10, r: 70, b: 42, l: 82 };

      const colScale = d3.scaleOrdinal()
        .domain(byCountry.map((d) => d.k))
        .range(brandRamp(brandCol, byCountry.length));

      const y = d3.scaleBand()
        .domain(byCountry.map((d) => d.k))
        .range([m.t, H - m.b])
        .padding(0.35);

      const x = d3.scaleLinear()
        .domain([0, d3.max(byCountry, (d) => d.v) * 1.12])
        .range([m.l, W - m.r]);

      svg.append("g")
        .selectAll("line.vgrid")
        .data(x.ticks(4))
        .join("line")
          .attr("x1", (d) => x(d)).attr("x2", (d) => x(d))
          .attr("y1", m.t).attr("y2", H - m.b)
          .attr("stroke", "rgba(255,255,255,.07)")
          .attr("stroke-dasharray", "3,3");

      svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${H - m.b})`)
        .call(d3.axisBottom(x).ticks(4).tickSize(3).tickFormat(fmt$k))
        .select(".domain").remove();

      svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${m.l},0)`)
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain").remove();

      svg.append("text")
        .attr("x", (m.l + W - m.r) / 2).attr("y", H - m.b + 30)
        .attr("text-anchor", "middle").attr("fill", "#c2a4c9").attr("font-size", 10)
        .text("Revenue (USD)");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(m.t + (H - m.b - m.t) / 2)).attr("y", 14)
        .attr("text-anchor", "middle").attr("fill", "#c2a4c9").attr("font-size", 10)
        .text("Country");

  /*Lollipop grafikon – kombinacija linija i krugova s animiranim rastom
    Izvor: D3 Graph Gallery – https://d3-graph-gallery.com/lollipop.html */
      svg.selectAll(".stem")
        .data(byCountry)
        .join("line")
          .attr("class", "stem")
          .attr("x1", m.l).attr("x2", m.l)
          .attr("y1", (d) => y(d.k) + y.bandwidth() / 2)
          .attr("y2", (d) => y(d.k) + y.bandwidth() / 2)
          .attr("stroke", (d) => colScale(d.k))
          .attr("stroke-width", 2).attr("opacity", 0.7)
          .transition().duration(650).delay((d, i) => i * 50)
          .attr("x2", (d) => x(d.v));

      svg.selectAll(".lol")
        .data(byCountry)
        .join("circle")
          .attr("class", "lol")
          .attr("cy", (d) => y(d.k) + y.bandwidth() / 2)
          .attr("cx", m.l).attr("r", 7)
          .attr("fill", (d) => colScale(d.k))
          .attr("stroke", "rgba(255,255,255,.25)").attr("stroke-width", 1.5)
          .on("mousemove", (e, d) => {
            showTip(`<b>${d.k}</b><br>${fmt$(d.v)}`, e);
            moveTip(e);
          })
          .on("mouseleave", hideTip)
          .transition().duration(650).delay((d, i) => i * 50)
          .attr("cx", (d) => x(d.v));

      svg.selectAll(".llbl")
        .data(byCountry)
        .join("text")
          .attr("class", "llbl")
          .attr("y", (d) => y(d.k) + y.bandwidth() / 2 + 4)
          .attr("x", m.l)
          .attr("fill", "#f5eeff").attr("font-size", 10).attr("font-weight", 600)
          .attr("opacity", 0)
          .text((d) => fmt$k(d.v))
          .transition().delay((d, i) => i * 50 + 500).duration(300)
          .attr("x", (d) => x(d.v) + 13)
          .attr("opacity", 1);
    }
  }

  selBrand.on("change", drawExplorer);
  drawExplorer();

  /* ── 4. RADAR COMPARISON ─────────────────────────────────── */

  const dims = [
    { key: "revenue", label: "Revenue",    fmt: fmt$ },
    { key: "units",   label: "Units Sold", fmt: fmtN },
    { key: "orders",  label: "Orders",     fmt: fmtN },
  ];

  const selA = d3.select("#selA");
  const selB = d3.select("#selB");

  byBrand.forEach((b) => {
    selA.append("option").attr("value", b.brand).text(b.brand);
    selB.append("option").attr("value", b.brand).text(b.brand);
  });

  selA.property("value", byBrand[0].brand);
  selB.property("value", byBrand[1].brand);

  /*Radar grafikon – algoritam kutova osi i normalizacija vrijednosti
    Izvor: D3 Graph Gallery – https://d3-graph-gallery.com/spider.html */
  function drawRadar() {
    const a = byBrand.find((b) => b.brand === selA.property("value"));
    const b = byBrand.find((b) => b.brand === selB.property("value"));

    const svg = d3.select("#chartRadar");
    const W   = 520, H = 440, cx = W / 2, cy = H / 2 + 10;
    const R   = Math.min(W, H) / 2 - 70;

    const ang   = (i) => -Math.PI / 2 + i * (2 * Math.PI / dims.length);
    const point = (i, v) => [cx + Math.cos(ang(i)) * R * v, cy + Math.sin(ang(i)) * R * v];

    const dimMax = {};
    dims.forEach((d) => (dimMax[d.key] = d3.max(byBrand, (b) => b[d.key])));

    const ptsA  = dims.map((d, i) => point(i, a[d.key] / dimMax[d.key]));
    const ptsB  = dims.map((d, i) => point(i, b[d.key] / dimMax[d.key]));
    const toStr = (pts) => pts.map((p) => p.join(",")).join(" ");

    if (svg.select(".radar-grid").empty()) {
      svg.attr("viewBox", `0 0 ${W} ${H}`);

      const grid = svg.append("g").attr("class", "radar-grid");

      [0.25, 0.5, 0.75, 1].forEach((t) => {
        grid.append("polygon")
          .attr("points", dims.map((_, i) => point(i, t).join(",")).join(" "))
          .attr("fill",   "none")
          .attr("stroke", "rgba(255,255,255,.08)");
      });

      dims.forEach((d, i) => {
        const [px, py] = point(i, 1);

        grid.append("line")
          .attr("x1", cx).attr("y1", cy)
          .attr("x2", px).attr("y2", py)
          .attr("stroke", "rgba(255,255,255,.08)");

        grid.append("text")
          .attr("x", cx + Math.cos(ang(i)) * (R + 26))
          .attr("y", cy + Math.sin(ang(i)) * (R + 26))
          .attr("text-anchor", "middle").attr("dy", "0.35em")
          .attr("fill", "#c9aed8").attr("font-size", 12)
          .text(d.label);
      });

      [0.25, 0.5, 0.75].forEach((t) => {
        grid.append("text")
          .attr("x", cx + 4).attr("y", cy - R * t - 4)
          .attr("fill", "rgba(255,255,255,.3)").attr("font-size", 9)
          .text(`${Math.round(t * 100)}%`);
      });

      svg.append("polygon").attr("class", "shapeA")
        .attr("points", toStr(dims.map((_, i) => point(i, 0))))
        .attr("fill", brandColor(a.brand)).attr("fill-opacity", 0.18)
        .attr("stroke", brandColor(a.brand)).attr("stroke-width", 2);

      svg.append("polygon").attr("class", "shapeB")
        .attr("points", toStr(dims.map((_, i) => point(i, 0))))
        .attr("fill", brandColor(b.brand)).attr("fill-opacity", 0.18)
        .attr("stroke", brandColor(b.brand)).attr("stroke-width", 2);

      dims.forEach((_, i) => {
        svg.append("circle").attr("class", `dotA-${i}`).attr("r", 4)
          .attr("cx", cx).attr("cy", cy).attr("fill", brandColor(a.brand));
        svg.append("circle").attr("class", `dotB-${i}`).attr("r", 4)
          .attr("cx", cx).attr("cy", cy).attr("fill", brandColor(b.brand));
      });

      svg.append("circle").attr("class", "legCircA").attr("cx", 20).attr("cy", 20).attr("r", 6).attr("fill", brandColor(a.brand));
      svg.append("text")  .attr("class", "legTxtA") .attr("x",  32).attr("y",  24).attr("fill", "#f5eeff").attr("font-size", 13).text(a.brand);
      svg.append("circle").attr("class", "legCircB").attr("cx", 20).attr("cy", 44).attr("r", 6).attr("fill", brandColor(b.brand));
      svg.append("text")  .attr("class", "legTxtB") .attr("x",  32).attr("y",  48).attr("fill", "#f5eeff").attr("font-size", 13).text(b.brand);
    }

    const dur = 600;

    svg.select(".shapeA")
      .attr("fill", brandColor(a.brand))
      .attr("stroke", brandColor(a.brand))
      .transition().duration(dur).ease(d3.easeCubicInOut)
      .attr("points", toStr(ptsA));

    svg.select(".shapeB")
      .attr("fill", brandColor(b.brand))
      .attr("stroke", brandColor(b.brand))
      .transition().duration(dur).ease(d3.easeCubicInOut)
      .attr("points", toStr(ptsB));

    dims.forEach((_, i) => {
      svg.select(`.dotA-${i}`)
        .attr("fill", brandColor(a.brand))
        .transition().duration(dur).ease(d3.easeCubicInOut)
        .attr("cx", ptsA[i][0]).attr("cy", ptsA[i][1]);

      svg.select(`.dotB-${i}`)
        .attr("fill", brandColor(b.brand))
        .transition().duration(dur).ease(d3.easeCubicInOut)
        .attr("cx", ptsB[i][0]).attr("cy", ptsB[i][1]);
    });

    svg.select(".legCircA").attr("fill", brandColor(a.brand));
    svg.select(".legTxtA") .attr("fill", "#f5eeff").text(a.brand);
    svg.select(".legCircB").attr("fill", brandColor(b.brand));
    svg.select(".legTxtB") .attr("fill", "#f5eeff").text(b.brand);

    const t = d3.select("#vsTable");
    t.html("");

    const tbl = t.append("table");
    tbl.append("thead").append("tr")
      .html(`<th>Metric</th><th>${a.brand}</th><th>${b.brand}</th><th>Δ</th>`);

    const tb = tbl.append("tbody");

    dims.forEach((dim) => {
      const diff = a[dim.key] - b[dim.key];
      const sign = diff >= 0 ? "+" : "−";
      const col  = diff >= 0 ? "#d2b26d" : "#7a5af5";

      tb.append("tr").html(
        `<td>${dim.label}</td>
         <td>${dim.fmt(a[dim.key])}</td>
         <td>${dim.fmt(b[dim.key])}</td>
         <td style="color:${col};font-weight:600">${sign}${dim.fmt(Math.abs(diff))}</td>`
      );
    });
  }

  selA.on("change", drawRadar);
  selB.on("change", drawRadar);
  drawRadar();

})
.catch((err) => {
  document.body.innerHTML +=
    `<div style="padding:40px;color:#ff8fb1">
       Failed to load CSV: ${err}.
       Run <code>python3 -m http.server</code> and open http://localhost:8000
     </div>`;
});