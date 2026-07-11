namespace Tms.Api.Services;

public static class RouteGeocoding
{
    static readonly Dictionary<string, (double Lat, double Lng)> Cities = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Mumbai"] = (19.076, 72.8777),
        ["Pune"] = (18.5204, 73.8567),
        ["Delhi"] = (28.6139, 77.209),
        ["New Delhi"] = (28.6139, 77.209),
        ["Delhi NCR"] = (28.6139, 77.209),
        ["Navi Mumbai"] = (19.033, 73.0297),
        ["Nashik"] = (19.9975, 73.7898),
        ["Nagpur"] = (21.1458, 79.0882),
        ["Ahmedabad"] = (23.0225, 72.5714),
        ["Surat"] = (21.1702, 72.8311),
        ["Vadodara"] = (22.3072, 73.1812),
        ["Rajkot"] = (22.3039, 70.8022),
        ["Jaipur"] = (26.9124, 75.7873),
        ["Jodhpur"] = (26.2389, 73.0243),
        ["Udaipur"] = (24.5854, 73.7125),
        ["Kolkata"] = (22.5726, 88.3639),
        ["Howrah"] = (22.5958, 88.2636),
        ["Chennai"] = (13.0827, 80.2707),
        ["Bengaluru"] = (12.9716, 77.5946),
        ["Bangalore"] = (12.9716, 77.5946),
        ["Hyderabad"] = (17.385, 78.4867),
        ["Secunderabad"] = (17.4399, 78.4983),
        ["Lucknow"] = (26.8467, 80.9462),
        ["Kanpur"] = (26.4499, 80.3319),
        ["Indore"] = (22.7196, 75.8577),
        ["Bhopal"] = (23.2599, 77.4126),
        ["Patna"] = (25.5941, 85.1376),
        ["Ranchi"] = (23.3441, 85.3096),
        ["Jamshedpur"] = (22.8046, 86.2029),
        ["Guwahati"] = (26.1445, 91.7362),
        ["Bhubaneswar"] = (20.2961, 85.8245),
        ["Visakhapatnam"] = (17.6868, 83.2185),
        ["Coimbatore"] = (11.0168, 76.9558),
        ["Kochi"] = (9.9312, 76.2673),
        ["Thiruvananthapuram"] = (8.5241, 76.9366),
        ["Mundra"] = (22.8395, 69.7213),
        ["Ludhiana"] = (30.901, 75.8573),
        ["Chandigarh"] = (30.7333, 76.7794),
        ["Amritsar"] = (31.634, 74.8723),
        ["Agra"] = (27.1767, 78.0081),
        ["Varanasi"] = (25.3176, 82.9739),
        ["Goa"] = (15.2993, 74.124),
        ["Panaji"] = (15.4909, 73.8278),
    };

    public static (double Lat, double Lng)? Resolve(string? label, decimal? lat, decimal? lng)
    {
        if (lat.HasValue && lng.HasValue)
            return ((double)lat.Value, (double)lng.Value);

        if (string.IsNullOrWhiteSpace(label)) return null;

        var text = label.Trim();
        if (Cities.TryGetValue(text, out var exact))
            return exact;

        foreach (var (city, coords) in Cities)
        {
            if (text.Contains(city, StringComparison.OrdinalIgnoreCase))
                return coords;
        }

        return null;
    }
}

public static class RouteMath
{
    public static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180)
            * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    public static double RouteDistanceKm(IReadOnlyList<(double Lat, double Lng)> points)
    {
        if (points.Count < 2) return 0;
        var total = 0.0;
        for (var i = 1; i < points.Count; i++)
            total += HaversineKm(points[i - 1].Lat, points[i - 1].Lng, points[i].Lat, points[i].Lng);
        return total;
    }

    public static List<int> NearestNeighborOrder(IReadOnlyList<(double Lat, double Lng)> points, int startIndex = 0)
    {
        var n = points.Count;
        var visited = new bool[n];
        var order = new List<int> { startIndex };
        visited[startIndex] = true;

        for (var step = 1; step < n; step++)
        {
            var last = order[^1];
            var best = -1;
            var bestDist = double.MaxValue;
            for (var i = 0; i < n; i++)
            {
                if (visited[i]) continue;
                var d = HaversineKm(points[last].Lat, points[last].Lng, points[i].Lat, points[i].Lng);
                if (d < bestDist)
                {
                    bestDist = d;
                    best = i;
                }
            }
            if (best >= 0)
            {
                order.Add(best);
                visited[best] = true;
            }
        }
        return order;
    }

    public static List<int> TwoOptImprove(IReadOnlyList<(double Lat, double Lng)> points, List<int> order)
    {
        if (order.Count < 4) return order;

        var route = order.ToList();
        var improved = true;
        while (improved)
        {
            improved = false;
            for (var i = 1; i < route.Count - 2; i++)
            {
                for (var k = i + 1; k < route.Count - 1; k++)
                {
                    var a = route[i - 1];
                    var b = route[i];
                    var c = route[k];
                    var d = route[k + 1];
                    var before = HaversineKm(points[a].Lat, points[a].Lng, points[b].Lat, points[b].Lng)
                        + HaversineKm(points[c].Lat, points[c].Lng, points[d].Lat, points[d].Lng);
                    var after = HaversineKm(points[a].Lat, points[a].Lng, points[c].Lat, points[c].Lng)
                        + HaversineKm(points[b].Lat, points[b].Lng, points[d].Lat, points[d].Lng);
                    if (after + 0.001 < before)
                    {
                        route.Reverse(i, k - i + 1);
                        improved = true;
                    }
                }
            }
        }
        return route;
    }
}
